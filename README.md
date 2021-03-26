#peer to peer signaling success

-signaling 과정 (A와 B의 통신)
1. A가 offer생성하여 RTCPeerConnection에 localDescription으로 저장하고, signaling Server로 전송.
2. signaling Server는 B에게 A의 offer를 전송.
3. A의 offer를 받은 B는 A의 offer를 RTCPeerConnection에 remoteDescription으로 저장.
4. B는 answer를 생성하여 RTCPeerConnection에 localDescription으로 저장하고, signaling Server로 전송.
5. signaling Server는 A에게 B의 answer를 전송.
6. B의 answer를 받은 A는 B의 answer를 RTCPeerConnection에 remoteDescription으로 저장.
7. 이 때, onicecandidate event 발생하여 ice candidate 정보 생성.
8. A와 B 각자 서로에게 자신의 candidate 정보를 보냄.
9. 자신의 peerConnection에 상대의 candidate 정보 저장.
10. 이 때, ontrack event 발생. stream이 전송됨.
