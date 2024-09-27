import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import dynamic from 'next/dynamic';


export default function StructureEditor() {
    // Dynamically import the Editor component from ketcher-react
    const Editor = dynamic(() => import('ketcher-react').then(mod => mod.Editor), {
        ssr: false,
    });

    const structServiceProvider = new StandaloneStructServiceProvider();
    return (
        <>
            <div style={{ position: 'relative', height: '80vh', overflow: 'hidden' }}>
                <Editor
                    staticResourcesUrl={process.env.PUBLIC_URL}
                    structServiceProvider={structServiceProvider}
                    style={{ width: '100%', height: '100%' }}
                    onInit={(ketcher) => {
                    // If window defined, attach the ketcher instance to it
                    if (typeof window !== 'undefined') {
                        window.ketcher = ketcher;
                    } else {
                        // Try again later
                        setTimeout(() => {
                        window.ketcher = ketcher;
                        }, 1000);
                    }
                    }}
                />
            </div>
        </>
    );
}
