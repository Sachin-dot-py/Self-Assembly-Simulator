'use client'

import { useRef, useLayoutEffect } from 'react';
import Script from 'next/script'

export default function VisualElem({ markup }) {
    const elRef = useRef();

    useLayoutEffect(() => {
        const range = document.createRange();
        range.selectNode(elRef.current);
        const documentFragment = range.createContextualFragment(markup);
        elRef.current.innerHTML = '';
        elRef.current.append(documentFragment);
    }, [markup]);

    return (
        <>
            <Script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.4/require.min.js" strategy="lazyOnload" />
            <Script src="https://cdn.jsdelivr.net/npm/@jupyter-widgets/html-manager@^1.0.1/dist/embed-amd.js" strategy="lazyOnload" />
            <Script src="nglview-js-widgets.js" strategy="lazyOnload" />
            <div ref={elRef} className="visualization-container"></div>
        </>
    );
}
