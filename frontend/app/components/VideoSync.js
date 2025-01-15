import React, { useRef, useEffect } from 'react';


export default function VideoSync({ visualId, progress, display }) {
    const vidRef = useRef(null);

    useEffect(() => {
        if (vidRef.current) {
            try{
                const duration = vidRef.current.duration;
                vidRef.current.currentTime = (progress / 100) * duration;
            } catch (e) {
                vidRef.current.currentTime = 0;
            }
            
        }
    }, [progress]);

    return (
        <>
            <video 
                ref={vidRef} 
                height="100%" 
                width="100%" 
                controls={false}
            >
                { display === "video" ? <source src={`/api/getvideo/${visualId}`} type="video/mp4" /> : 
                    <source src={`/api/getplot/${display}/${visualId}`} type="video/mp4" /> }
            </video>
        </>
    );
}
