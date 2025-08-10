import {
  doc,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  getDoc,
  query,
  where,
  arrayUnion,
  serverTimestamp,
  runTransaction,
  deleteDoc,
  getDocs
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * WebRTCService
 * - Firestore-based signaling (calls/{callId}/signaling)
 * - Deterministic polite/impolite by comparing UIDs (string compare)
 * - Perfect negotiation pattern (makingOffer + polite/ignore logic)
 * - Early ICE candidate buffering per-peer
 * - Batched ICE writes (small window) to reduce Firestore write bursts
 *
 * Usage:
 *  - webrtcService.startCall(type, myUid, participants) => returns callId
 *  - webrtcService.answerCall(callId, myUid)
 *  - webrtcService.sendMessage(text, senderName)
 *  - register callbacks: onLocalStream, onRemoteStreamsChange, onNewMessage, onCallEnded, onScreenShareStateChange, onRemoteScreenStream
 */

const servers = {
  iceServers: [
    { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
  ],
  iceCandidatePoolSize: 10,
};

class WebRTCService {
  constructor() {
    this.peerConnections = new Map();   
    this.dataChannels = new Map();      
    this.peerListeners = new Map();     
    this.localStream = null;
    this.screenStream = null;
    this.remoteStreams = {};            
    this.remoteScreenStreams = {};      
    this.callId = null;
    this.currentUserUid = null;

    this.cameraSenders = new Map();     
    this.iceCandidateQueues = new Map(); 

    this.makingOffer = new Map();       
    this.ignoreOffer = new Map();       

    this.onLocalStream = null;
    this.onRemoteStreamsChange = null;
    this.onRemoteScreenStream = null;
    this.onNewMessage = null;
    this.onCallEnded = null;
    this.onScreenShareStateChange = null;
  }


  async startCall(type, initiatorUid, participants = []) {
    this.currentUserUid = initiatorUid;
    this.localStream = await this._getLocalStream(type === "video");
    this.onLocalStream?.(this.localStream);

    const callDocRef = await addDoc(collection(db, "calls"), {
      createdBy: initiatorUid,
      participants,
      type,
      status: "ringing",
      attendees: [initiatorUid],
      createdAt: serverTimestamp(),
    });
    this.callId = callDocRef.id;

    this._listenForNewAttendees();
    this._listenForCallEnd();

    return this.callId;
  }

  async answerCall(callId, answererUid) {
    this.currentUserUid = answererUid;
    this.callId = callId;

    const callDocRef = doc(db, "calls", this.callId);
    const snapshot = await getDoc(callDocRef);
    const callData = snapshot.exists() ? snapshot.data() : null;

    if (!callData || callData.status === "ended") {
      console.warn("Call not available / already ended");
      this.hangUp();
      return;
    }

    this.localStream = await this._getLocalStream(callData.type === "video");
    this.onLocalStream?.(this.localStream);

    await updateDoc(callDocRef, { status: "accepted", attendees: arrayUnion(answererUid) });

    const existing = callData.attendees || [];
    for (const attendeeUid of existing) {
      if (attendeeUid !== this.currentUserUid && !this.peerConnections.has(attendeeUid)) {
        this._createPeerConnection(attendeeUid);
      }
    }

    this._listenForNewAttendees();
    this._listenForCallEnd();
  }

  async hangUp() {
    if (!this.callId) return;

    try { this.localStream?.getTracks().forEach(t => t.stop()); } catch (_) {}
    try { this.screenStream?.getTracks().forEach(t => t.stop()); } catch (_) {}

    for (const unsub of this.peerListeners.values()) {
      try { unsub(); } catch (_) {}
    }
    this.peerListeners.clear();

    for (const pc of this.peerConnections.values()) {
      try { pc.close(); } catch (_) {}
    }

    try {
      const callDocRef = doc(db, "calls", this.callId);
      await runTransaction(db, async (transaction) => {
        const callDoc = await transaction.get(callDocRef);
        if (!callDoc.exists()) return;
        const attendees = callDoc.data().attendees || [];
        const filtered = attendees.filter(uid => uid !== this.currentUserUid);
        if (filtered.length === 0) {
          transaction.update(callDocRef, { status: "ended", attendees: [] });
        } else {
          transaction.update(callDocRef, { attendees: filtered });
        }
      });
    } catch (err) {
      console.warn("hangUp transaction failed (non-fatal):", err);
    }

    this.onCallEnded?.();
    this._resetState();
  }

  async startScreenShare() {
    if (!this.callId || this.screenStream) return;
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = this.screenStream.getVideoTracks()[0];

      for (const [remoteUid, sender] of this.cameraSenders.entries()) {
        if (sender && typeof sender.replaceTrack === "function") {
          try {
            await sender.replaceTrack(screenTrack);
          } catch (e) {
            
            const pc = this.peerConnections.get(remoteUid);
            if (pc) pc.addTrack(screenTrack, this.screenStream);
          }
        } else {
          const pc = this.peerConnections.get(remoteUid);
          if (pc) pc.addTrack(screenTrack, this.screenStream);
        }
      }
      this.onScreenShareStateChange?.(true, this.screenStream);

      screenTrack.onended = () => {
        this.stopScreenShare();
      };
    } catch (err) {
      console.error("startScreenShare failed:", err);
      this.onScreenShareStateChange?.(false, null);
    }
  }

  async stopScreenShare() {
    if (!this.screenStream) return;
    const camTrack = this.localStream?.getVideoTracks()?.[0] || null;
    for (const [remoteUid, sender] of this.cameraSenders.entries()) {
      if (sender && typeof sender.replaceTrack === "function") {
        try { await sender.replaceTrack(camTrack); } catch (_) {}
      }
    }
    try { this.screenStream.getTracks().forEach(t => t.stop()); } catch (_) {}
    this.screenStream = null;
    this.onScreenShareStateChange?.(false, null);
  }

  sendMessage(text, senderName) {
    if (!this.currentUserUid) return;
    const message = { id: Date.now(), text, senderUid: this.currentUserUid, senderName, timestamp: Date.now() };
    this.onNewMessage?.([message]);
    for (const [remoteUid, ch] of this.dataChannels.entries()) {
      try { if (ch && ch.readyState === "open") ch.send(JSON.stringify(message)); } catch (_) {}
    }
  }


  _resetState() {
    this.peerConnections.clear();
    this.dataChannels.clear();
    this.peerListeners.clear();
    this.cameraSenders.clear();
    this.iceCandidateQueues.clear();
    this.localStream = null;
    this.screenStream = null;
    this.remoteStreams = {};
    this.remoteScreenStreams = {};
    this.callId = null;
    this.currentUserUid = null;
    this.makingOffer.clear();
    this.ignoreOffer.clear();
  }

  async _getLocalStream(videoEnabled) {
    return await navigator.mediaDevices.getUserMedia({ video: videoEnabled, audio: true });
  }

  _listenForCallEnd() {
    if (!this.callId) return;
    const callDocRef = doc(db, "calls", this.callId);
    const unsub = onSnapshot(callDocRef, (snap) => {
      const status = snap.data()?.status;
      if (status === "ended") this.hangUp();
    });
    this.peerListeners.set("__callDoc__", unsub);
  }

  _listenForNewAttendees() {
    if (!this.callId) return;
    const callDocRef = doc(db, "calls", this.callId);
    const unsub = onSnapshot(callDocRef, (snap) => {
      const data = snap.data();
      if (!data) return;
      (data.attendees || []).forEach((uid) => {
        if (uid !== this.currentUserUid && !this.peerConnections.has(uid)) {
          this._createPeerConnection(uid);
        }
      });
    });
    this.peerListeners.set("__attendees__", unsub);
  }

  _deterministicPolite(remoteUid) {
    if (!this.currentUserUid) return false;
    return String(this.currentUserUid) > String(remoteUid);
  }

  async _createPeerConnection(remoteUid) {
    if (!this.callId || !this.currentUserUid) return;
    if (this.peerConnections.has(remoteUid)) return;

    const polite = this._deterministicPolite(remoteUid);

    this.iceCandidateQueues.set(remoteUid, []);
    this.makingOffer.set(remoteUid, false);
    this.ignoreOffer.set(remoteUid, false);

    const pc = new RTCPeerConnection(servers);
    this.peerConnections.set(remoteUid, pc);

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        try {
          const sender = pc.addTrack(track, this.localStream);
          if (track.kind === "video") this.cameraSenders.set(remoteUid, sender);
        } catch (err) {
          console.warn("addTrack failed for", track.kind, err);
        }
      }
    }

    if (!polite) {
      try {
        const dc = pc.createDataChannel("chat");
        this._attachDataChannelHandlers(remoteUid, dc);
        this.dataChannels.set(remoteUid, dc);
      } catch (e) {
        console.warn("createDataChannel failed:", e);
      }
    }

    pc.ondatachannel = (event) => {
      const rc = event.channel;
      this._attachDataChannelHandlers(remoteUid, rc);
      this.dataChannels.set(remoteUid, rc);
    };

    pc.ontrack = (event) => {
      const stream = event.streams && event.streams[0];
      if (!stream) return;

      const vTracks = stream.getVideoTracks() || [];
      const aTracks = stream.getAudioTracks() || [];
      let isScreen = false;
      if (vTracks.length > 0) {
        const label = vTracks[0].label || "";
        if (label.toLowerCase().includes("screen") || label.toLowerCase().includes("display")) isScreen = true;
      }
      if (!isScreen && vTracks.length > 0 && aTracks.length === 0) isScreen = true;

      if (isScreen) {
        this.remoteScreenStreams[remoteUid] = stream;
        this.onRemoteScreenStream?.(remoteUid, stream);
        stream.onremovetrack = () => {
          delete this.remoteScreenStreams[remoteUid];
          this.onRemoteScreenStream?.(remoteUid, null);
        };
      } else {
        this.remoteStreams[remoteUid] = stream;
        this.onRemoteStreamsChange?.({ ...this.remoteStreams });
      }
    };

    let negotiationTimer = null;
    pc.onnegotiationneeded = async () => {
      if (this.makingOffer.get(remoteUid)) return;
      if (pc.signalingState !== "stable") return;

      if (negotiationTimer) clearTimeout(negotiationTimer);
      negotiationTimer = setTimeout(async () => {
        negotiationTimer = null;
        try {
          this.makingOffer.set(remoteUid, true);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          await this._writeSignaling({
            from: this.currentUserUid,
            to: remoteUid,
            offer: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("onnegotiationneeded failed:", err);
        } finally {
          this.makingOffer.set(remoteUid, false);
        }
      }, 120);
    };

    const signalingCol = collection(doc(db, "calls", this.callId), "signaling");
    let iceBatch = [];
    let iceTimer = null;
    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      iceBatch.push(e.candidate.toJSON());
      if (iceTimer) return;
      iceTimer = setTimeout(async () => {
        const toSend = iceBatch.splice(0);
        iceTimer = null;
        for (const cand of toSend) {
          try {
            await addDoc(signalingCol, {
              from: this.currentUserUid,
              to: remoteUid,
              candidate: cand,
              createdAt: serverTimestamp(),
            });
          } catch (err) {
            console.warn("Failed to write ICE candidate (skipped):", err);
          }
        }
      }, 80);
    };

    const q = query(
      collection(doc(db, "calls", this.callId), "signaling"),
      where("to", "==", this.currentUserUid),
      where("from", "==", remoteUid)
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== "added") continue;
        const data = change.doc.data();
        try {
          if (data.offer) {
            const offerCollision = this.makingOffer.get(remoteUid) || pc.signalingState !== "stable";
            this.ignoreOffer.set(remoteUid, !polite && offerCollision);

            if (this.ignoreOffer.get(remoteUid)) {
              console.log(`[signaling] Ignoring offer from ${remoteUid} due to collision`);
            } else {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
              } catch (err) {
                console.warn("setRemoteDescription(offer) failed:", err);
                continue;
              }

              try {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await addDoc(signalingCol, {
                  from: this.currentUserUid,
                  to: remoteUid,
                  answer: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
                  createdAt: serverTimestamp(),
                });
              } catch (err) {
                console.error("Failed to create/send answer:", err);
              }

              await this._processIceQueue(remoteUid);
            }
          } else if (data.answer) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            } catch (err) {
              console.warn("setRemoteDescription(answer) failed:", err);
            }
            await this._processIceQueue(remoteUid);
          } else if (data.candidate) {
            try {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              } else {
                const qList = this.iceCandidateQueues.get(remoteUid) || [];
                if (qList.length < 300) qList.push(data.candidate);
                this.iceCandidateQueues.set(remoteUid, qList);
              }
            } catch (err) {
              console.warn("addIceCandidate failed (non-fatal):", err);
            }
          }
        } catch (err) {
          console.error("Error processing signaling doc:", err);
        } finally {
          try { await deleteDoc(change.doc.ref); } catch (_) {}
        }
      }
    });

    this.peerListeners.set(remoteUid, unsub);

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`pc state with ${remoteUid}: ${state}`);
      if (state === "failed" || state === "disconnected" || state === "closed") {
        this._cleanupPeer(remoteUid);
      }
    };

  }

  async _processIceQueue(remoteUid) {
    const pc = this.peerConnections.get(remoteUid);
    const queue = this.iceCandidateQueues.get(remoteUid) || [];
    if (!pc || queue.length === 0) return;
    const items = queue.splice(0);
    for (const cand of items) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn("Error adding queued ICE candidate:", err);
      }
    }
    this.iceCandidateQueues.set(remoteUid, []);
  }

  async _writeSignaling(payload) {
    if (!this.callId) return;
    try {
      const col = collection(doc(db, "calls", this.callId), "signaling");
      await addDoc(col, payload);
    } catch (err) {
      console.warn("writeSignaling failed (skipped):", err);
    }
  }

  _attachDataChannelHandlers(remoteUid, channel) {
    channel.onopen = () => console.log("Data channel open:", remoteUid);
    channel.onmessage = (e) => {
      try { this.onNewMessage?.([JSON.parse(e.data)]); } catch (_) {}
    };
    channel.onclose = () => console.log("Data channel closed:", remoteUid);
    channel.onerror = (err) => console.warn("Data channel error:", remoteUid, err);
  }

  async _cleanupSignalingDocsForPair(remoteUid) {
    if (!this.callId) return;
    try {
      const colRef = collection(doc(db, "calls", this.callId), "signaling");
      const q1 = query(colRef, where("from", "==", remoteUid), where("to", "==", this.currentUserUid));
      const q2 = query(colRef, where("from", "==", this.currentUserUid), where("to", "==", remoteUid));
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const dels = snap1.docs.concat(snap2.docs).map(d => deleteDoc(d.ref).catch(()=>{}));
      await Promise.all(dels);
    } catch (e) { /* ignore */ }
  }

  async _cleanupPeer(remoteUid) {
    console.log("Cleaning up peer:", remoteUid);
    const unsub = this.peerListeners.get(remoteUid);
    if (unsub) {
      try { unsub(); } catch (_) {}
      this.peerListeners.delete(remoteUid);
    }
    const pc = this.peerConnections.get(remoteUid);
    if (pc) {
      try { pc.close(); } catch (_) {}
      this.peerConnections.delete(remoteUid);
    }
    if (this.dataChannels.has(remoteUid)) this.dataChannels.delete(remoteUid);
    this.cameraSenders.delete(remoteUid);
    this.iceCandidateQueues.delete(remoteUid);
    if (this.remoteStreams[remoteUid]) {
      delete this.remoteStreams[remoteUid];
      this.onRemoteStreamsChange?.({ ...this.remoteStreams });
    }
    if (this.remoteScreenStreams[remoteUid]) {
      delete this.remoteScreenStreams[remoteUid];
      this.onRemoteScreenStream?.(remoteUid, null);
    }
    await this._cleanupSignalingDocsForPair(remoteUid);
  }
}

export const webrtcService = new WebRTCService();
