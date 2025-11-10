import React from 'react';
import type { SearchResult } from '../types';

interface ResultDisplayProps {
    searchResult: SearchResult;
    imageUrl: string | null;
    imageError: string | null;
    query: string;
    printRef: React.RefObject<HTMLDivElement>;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ searchResult, imageUrl, imageError, query, printRef }) => {
    
    // Markdown-to-HTML simplificado y limpio
    const formattedText = searchResult.text.split('\n').map((line, index) => {
        let processedLine = line.replace(/\*\*/g, ''); // Eliminar asteriscos para controlar el formato

        // Encabezado Nivel 1
        if (processedLine.startsWith('# ')) {
            return (
                <h1 key={index} className="text-3xl font-extrabold text-white mt-4 mb-4">
                    {processedLine.substring(2)}
                </h1>
            );
        }
        // Encabezado Nivel 2
        if (processedLine.startsWith('## ')) {
            return (
                <h2 key={index} className="text-2xl font-bold text-cyan-400 mt-6 mb-3 border-b border-gray-600 pb-2">
                    {processedLine.substring(3)}
                </h2>
            );
        }
        // Manejar ### y otros niveles de encabezado para que no muestren los '#'
        if (processedLine.trim().startsWith('###')) {
            return (
                <p key={index} className="text-lg font-semibold text-gray-200 mt-4 mb-1">
                    {processedLine.trim().replace(/#+\s*/, '')}
                </p>
            );
        }
        // Lista numerada
        if (/^\s*\d+\.\s/.test(processedLine)) {
            const trimmedLine = processedLine.trim();
            const colonIndex = trimmedLine.indexOf(':');

            if (colonIndex > -1) {
                const heading = trimmedLine.substring(0, colonIndex + 1);
                const body = trimmedLine.substring(colonIndex + 1);
                return (
                    <p key={index} className="mb-2 text-gray-300">
                        <strong className="font-bold text-white">{heading}</strong>
                        <span>{body}</span>
                    </p>
                );
            }
             return <p key={index} className="mb-2 text-gray-300 font-bold">{trimmedLine}</p>;
        }
        // Lista con viñetas
        if (processedLine.startsWith('* ') || processedLine.startsWith('- ')) {
            return (
                 <div key={index} className="flex items-start mb-2 pl-4">
                    <span className="mr-2 text-cyan-400 leading-relaxed">•</span>
                    <p className="text-gray-300 flex-1">{processedLine.substring(2)}</p>
                </div>
            );
        }
        // Línea en blanco
        if (processedLine.trim() === '') {
            return <br key={index} />;
        }
        // Párrafo por defecto
        return <p key={index} className="mb-2 text-gray-300">{processedLine}</p>;
    });

    return (
        <div className="bg-gray-700 border border-gray-600 rounded-2xl shadow-2xl animate-fade-in">
            <div className="p-6 md:p-8">
                <div ref={printRef} className="bg-gray-700 p-4 rounded-lg">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
                        Proceso Constructivo: <span className="text-cyan-400">{query}</span>
                    </h2>
                    
                    <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-cyan-400">
                        {formattedText}
                    </div>

                    <div className="mt-8">
                        <h3 className="text-2xl font-bold text-cyan-400 mb-4">Esquema Ilustrativo</h3>
                        {imageUrl ? (
                            <div className="flex justify-center bg-black/20 p-4 rounded-lg border border-gray-700">
                               <img src={imageUrl} alt={`Esquema de ${query}`} className="max-w-full h-auto rounded-md shadow-lg" />
                            </div>
                        ) : imageError ? (
                            <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-lg text-center">
                                <p>{imageError}</p>
                            </div>
                        ) : null}
                    </div>
                </div>

                {searchResult.sources && searchResult.sources.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-600">
                        <h3 className="text-2xl font-bold text-cyan-400 mb-4">Fuentes Consultadas</h3>
                        <ul className="list-disc list-inside space-y-2">
                            {searchResult.sources.map((source, index) => (
                                <li key={index} className="text-gray-400">
                                    <a
                                        href={source.web.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-cyan-500 hover:text-cyan-400 hover:underline"
                                    >
                                        {source.web.title || source.web.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};