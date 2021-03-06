var peerConnection = new RTCPeerConnection();
var videoGrid;
var remoteVideo;

window.onload = () => {
    videoGrid = document.getElementById('video-grid');    
    remoteVideo = document.getElementById('remote-video');

    //Catch event of peer connection
    peerConnection.ontrack = (event) => {
        console.log('On track: ', event.track.kind);
        remoteVideo.srcObject = event.streams[0];    
    }    
    peerConnection.onconnectionstatechange = () => {
        console.log('Connection state of viewer and broadcaster: ', peerConnection.connectionState);
    }
};

window.onunload = window.onbeforeunload = () => {
    socket.close();
    socket = undefined;
    peerConnection.close();
    peerConnection = undefined;
};

/**
 * Socket
 */
const socket = io(window.location.origin);

socket.emit('viewer-join', ROOM_ID);

socket.on('broadcaster-join', (broadcasterId) => {
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('candidate', {
                candidate: event.candidate,
                receiver: broadcasterId               
            });
        }
    }
});

socket.on('offer', async ({offer, sender}) => {    
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));
    socket.emit('answer', {
        answer: peerConnection.localDescription,
        receiver: sender
    });
});

socket.on('candidate', ({candidate}) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});