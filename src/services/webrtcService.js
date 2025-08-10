import {
    doc,
    collection,
    addDoc,
    onSnapshot,
    updateDoc,
    getDoc,
    query,
    where,
    arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';

const servers = {
    iceServers: [
        { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    ],
    iceCandidatePoolSize: 10,
};

class WebRTCService {
    constructor() {
        this.peerConnections = new Map();
        this.localStream = null;
        this.remoteStreams = {};
        this.callId = null;
        this.currentUserUid = null;
        this.listeners = [];
        
        this.onLocalStream = null;
        this.onRemoteStreamsChange = null;
        this.onCallEnded = null;
    }

    // --- Public Methods ---

    async startCall(type, initiatorUid, participants) {
        this.currentUserUid = initiatorUid;
        this.localStream = await this._getLocalStream(type);
        this.onLocalStream?.(this.localStream);

        const callDocRef = await addDoc(collection(db, 'calls'), {
            createdBy: initiatorUid,
            participants: participants,
            status: 'ringing',
            type: type,
            attendees: [initiatorUid] // Creator is the first attendee
        });
        this.callId = callDocRef.id;
        
        this._listenForNewAttendees();
        return this.callId;
    }

    async answerCall(callId, answererUid) {
        this.currentUserUid = answererUid;
        this.callId = callId;
        const callDocRef = doc(db, 'calls', this.callId);
        const callData = (await getDoc(callDocRef)).data();

        this.localStream = await this._getLocalStream(callData.type);
        this.onLocalStream?.(this.localStream);
        
        await updateDoc(callDocRef, { 
            status: 'accepted', 
            attendees: arrayUnion(answererUid) 
        });

        // Connect to all existing attendees
        for (const attendeeUid of callData.attendees) {
            if (attendeeUid !== this.currentUserUid) {
                await this._createPeerConnection(attendeeUid, true); // This user initiates the connection to existing members
            }
        }

        this._listenForNewAttendees();
    }
    
    async declineCall(callId) {
        if (!callId) return;
        const callDocRef = doc(db, 'calls', callId);
        await updateDoc(callDocRef, { status: 'declined' });
    }

    async hangUp() {
        this.listeners.forEach(unsub => unsub());
        this.listeners = [];
        
        for (const pc of this.peerConnections.values()) {
            pc.close();
        }
        this.peerConnections.clear();

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }

        if (this.callId) {
            const callDocRef = doc(db, 'calls', this.callId);
            await updateDoc(callDocRef, { status: 'ended' });
        }
        
        this.onCallEnded?.();
        this._resetState();
    }

    // --- Private Helper Methods ---
    _resetState() {
        this.localStream = null;
        this.remoteStreams = {};
        this.callId = null;
        this.currentUserUid = null;
    }

    async _getLocalStream(type) {
        const constraints = {
            video: type === 'video',
            audio: true,
        };
        return await navigator.mediaDevices.getUserMedia(constraints);
    }

    _listenForNewAttendees() {
        const callDocRef = doc(db, 'calls', this.callId);
        const unsub = onSnapshot(callDocRef, (snapshot) => {
            const data = snapshot.data();
            const attendees = data.attendees || [];
            
            attendees.forEach(attendeeUid => {
                if (attendeeUid !== this.currentUserUid && !this.peerConnections.has(attendeeUid)) {
                    // A new user has joined, create a connection to them, but don't initiate (wait for their offer)
                    this._createPeerConnection(attendeeUid, false); 
                }
            });
        });
        this.listeners.push(unsub);
    }

    async _createPeerConnection(remoteUid, isInitiator) {
        if (this.peerConnections.has(remoteUid)) return;

        const pc = new RTCPeerConnection(servers);
        this.peerConnections.set(remoteUid, pc);

        this.localStream.getTracks().forEach(track => {
            pc.addTrack(track, this.localStream);
        });

        pc.ontrack = (event) => {
            this.remoteStreams[remoteUid] = event.streams[0];
            this.onRemoteStreamsChange?.({...this.remoteStreams});
        };

        const callDocRef = doc(db, 'calls', this.callId);
        const signalingCol = collection(callDocRef, 'signaling');

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                addDoc(signalingCol, {
                    from: this.currentUserUid,
                    to: remoteUid,
                    candidate: event.candidate.toJSON()
                });
            }
        };

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await addDoc(signalingCol, {
                from: this.currentUserUid,
                to: remoteUid,
                offer: { type: offer.type, sdp: offer.sdp }
            });
        }
        
        const q = query(signalingCol, where('to', '==', this.currentUserUid), where('from', '==', remoteUid));
        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (data.offer) {
                        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        await addDoc(signalingCol, {
                            from: this.currentUserUid,
                            to: remoteUid,
                            answer: { type: answer.type, sdp: answer.sdp }
                        });
                    } else if (data.answer) {
                        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                    } else if (data.candidate) {
                        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                    }
                }
            });
        });
        this.listeners.push(unsub);
    }
}

export const webrtcService = new WebRTCService();