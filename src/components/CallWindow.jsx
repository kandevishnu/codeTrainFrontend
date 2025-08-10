// src/components/CallWindow.jsx
import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare } from 'lucide-react';

const CallWindow = ({ localStream, remoteStream, onHangUp, isMuted, isVideoOff, onToggleMute, onToggleVideo }) => {
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    return (
        <div className="fixed inset-0 bg-slate-900 z-40 flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="relative w-full h-full bg-black rounded-lg overflow-hidden flex"
            >
                {/* Remote Video */}
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

                {/* Local Video */}
                <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-5 right-5 w-48 h-36 object-cover rounded-lg border-2 border-white/50" />

                {/* Call Controls */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-sm p-3 rounded-full">
                    <button onClick={onToggleMute} className="p-3 rounded-full bg-white/10 hover:bg-white/20">
                        {isMuted ? <MicOff /> : <Mic />}
                    </button>
                    <button onClick={onToggleVideo} className="p-3 rounded-full bg-white/10 hover:bg-white/20">
                        {isVideoOff ? <VideoOff /> : <Video />}
                    </button>
                    <button onClick={onHangUp} className="p-3 rounded-full bg-red-600 hover:bg-red-500">
                        <PhoneOff />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default CallWindow;