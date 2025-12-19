import React from 'react';

export default function Layout({ children }) {
    return (
        <div className="min-h-screen bg-[#0f1012] text-white">
            <main className="p-8">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
