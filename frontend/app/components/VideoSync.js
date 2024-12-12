import React, { useRef, useState } from 'react';

export default function VideoSync({ visualId, progress }) {
    const vidRef = useRef(null);

    useEffect(() => {
        if (vidRef.current) {
            const duration = vidRef.current.duration;

            vidRef.current.currentTime = (progress / 100) * duration;
        }
    }, [progress]);

    return (
        <>
            <video 
                ref={vidRef} 
                height="80%" 
                width="100%" 
                controls={false}
            >
                <source src={`/api/getvideo/${visualId}`} type="video/mp4" />
            </video>
        </>
    );
}
