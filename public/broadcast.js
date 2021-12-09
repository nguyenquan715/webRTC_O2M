var peerConnections = {};
var videoGrid;
var localVideo;
var localStream;
var stopVideoBtn;

var constraints = {
    video: true,
    audio: true
};

window.onload = async () => {     
    videoGrid = document.getElementById('video-grid');
    localVideo = document.createElement('video');
    localVideo.className = 'local-video';  
    stopVideoBtn = document.getElementById('stop-video');
    stopVideoBtn.onclick = () => {
        console.log('Stop video');
        constraints = {
            video: false,
            audio: true
        }
        for(key in peerConnections) {
            let peerConnection = peerConnections[key];
            peerConnection.getSenders().forEach(sender => {
                if(sender.track.kind == 'video') {
                    peerConnection.removeTrack(sender);
                }
            })
        }
    }
};

window.onunload = window.onbeforeunload = () => {
    socket.close();
    socket = undefined;    
};

/**
 * Socket
 */
const socket = io(window.location.origin);

socket.emit('broadcaster-join', ROOM_ID);

socket.on('viewer-join', async (viewerId) => {
    try {
        if(!localStream) {
            localStream = await start();
        }
        peerConnections[viewerId] = new RTCPeerConnection();
        localStream.getTracks().forEach(track => {
            console.log('Add track: ', track.kind);
            peerConnections[viewerId].addTrack(track, localStream);
        });
        await createOffer(peerConnections[viewerId], viewerId);
        peerConnections[viewerId].onicecandidate = event => {
            if (event.candidate) {
                socket.emit('candidate', {
                    candidate: event.candidate,
                    receiver: viewerId              
                });
            }
        }
        peerConnections[viewerId].onconnectionstatechange = () => {
            console.log(`Connection state of broadcaster and viewer ${viewerId}: ${peerConnections[viewerId].connectionState}`);
        }
    } catch (err) {
        console.log(err);
    }
});

socket.on('answer', ({answer, sender}) => {
    peerConnections[sender].setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', ({candidate, sender}) => {
    peerConnections[sender].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('over-broadcaster', () => {
    alert('This room had one broadcaster already');
});

/**
 * Function
 */
const start = async () => {    
    console.log('Get user media');
    const localStream = await navigator.mediaDevices.getUserMedia(constraints);        
    addVideoStream(localVideo, localStream);
    return localStream;
}

const addVideoStream = (video, stream) => {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
        videoGrid.append(video);
    });
}

const createOffer = async (peerConnection, receiver) => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));
    socket.emit('offer', {
        offer: peerConnection.localDescription,
        receiver: receiver
    });
}


