let peerConnection;
let myVideoStream;
const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true;

const constraints = {
    video: true,
    audio: true
};
navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
        myVideoStream = stream;
        addVideoStream(myVideo, stream);
    })
    .catch((e) => {
        console.error(e);
    });

const addVideoStream = (video, stream) => {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
        videoGrid.append(video);
    });
}

const socket = io(window.location.origin);

socket.emit('join-room', ROOM_ID);

socket.on('user-connected', async (senderId) => {
    peerConnection = new RTCPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', {
        offer: peerConnection.localDescription,
        socketId: senderId
    }); 
    
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('candidate', {
                candidate: event.candidate,
                socketId: senderId
            });
        }
    }
    
    myVideoStream.getTracks().forEach(track => peerConnection.addTrack(track, myVideoStream));
    peerConnection.ontrack = event => {
        const remoteVideo = document.createElement('video');
        const remoteStream = event.streams[0];
        addVideoStream(remoteVideo, remoteStream);
    }
});

socket.on('offer', async (senderId, offer) => {
    peerConnection = new RTCPeerConnection();
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', {
        answer: answer,
        socketId: senderId
    });

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('candidate', {
                candidate: event.candidate,
                socketId: senderId
            });
        }
    }
    
    myVideoStream.getTracks().forEach(track => peerConnection.addTrack(track, myVideoStream));
    peerConnection.ontrack = event => {
        const remoteVideo = document.createElement('video');
        const remoteStream = event.streams[0];
        addVideoStream(remoteVideo, remoteStream);
    }
});

socket.on('candidate', (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('answer', (answer) => {
    peerConnection.setRemoteDescription(answer);
});

window.onunload = window.onbeforeunload = () => {
    socket.close();
    peerConnection.close();
};

