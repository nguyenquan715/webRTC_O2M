var peerConnection = new RTCPeerConnection();
//Catch event of peer connection
peerConnection.ontrack = event => {
    console.log('On track: ', event.track.kind);
    if (!remoteVideo.srcObject) {
        const remoteStream = event.streams[0];
        addVideoStream(remoteVideo, remoteStream);
    }
}    
peerConnection.onconnectionstatechange = () => {
    console.log('Connection state of viewer and broadcaster: ', peerConnection.connectionState);
}

var videoGrid;
var remoteVideo;

window.onload = () => {
    videoGrid = document.getElementById('video-grid');    
    remoteVideo = document.createElement('video');    
    remoteVideo.className = 'remote-video';
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

/**
 * Function
 */
const addVideoStream = (video, stream) => {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
        videoGrid.append(video);
    });
}

