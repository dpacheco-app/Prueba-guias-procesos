import React, { useState, useCallback, useRef } from 'react';
import { SearchBar } from './components/SearchBar';
import { ResultDisplay } from './components/ResultDisplay';
import { Loader } from './components/Loader';
import { BuildingIcon } from './components/icons/BuildingIcon';
import { PrintIcon } from './components/icons/PrintIcon';
import { fetchConstructionProcess, generateProcessImage } from './services/geminiService';
import type { SearchResult } from './types';

// Declare global variables from CDN scripts
declare const jspdf: any;
declare const html2canvas: any;

interface SearchHistoryProps {
    history: string[];
    onHistoryClick: (query: string) => void;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({ history, onHistoryClick }) => {
    if (history.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 animate-fade-in">
            <span className="text-gray-400 text-sm font-medium">Búsquedas recientes:</span>
            {history.map((item) => (
                <button
                    key={item}
                    onClick={() => onHistoryClick(item)}
                    className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
                >
                    {item}
                </button>
            ))}
        </div>
    );
};


const App: React.FC = () => {
    const [query, setQuery] = useState<string>('');
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const handleSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery) return;
        setIsLoading(true);
        setError(null);
        setImageError(null);
        setSearchResult(null);
        setImageUrl(null);

        try {
            const [processDetailsResult, imageUrlResult] = await Promise.allSettled([
                fetchConstructionProcess(searchQuery),
                generateProcessImage(searchQuery),
            ]);

            // Handle text result
            if (processDetailsResult.status === 'fulfilled') {
                setSearchResult(processDetailsResult.value);
                setSearchHistory(prev => {
                    const updatedHistory = [searchQuery, ...prev.filter(q => q.toLowerCase() !== searchQuery.toLowerCase())];
                    return updatedHistory.slice(0, 3);
                });
            } else {
                console.error("Error fetching process details:", processDetailsResult.reason);
                throw new Error('Ocurrió un error al obtener los detalles del proceso.');
            }

            // Handle image result
            if (imageUrlResult.status === 'fulfilled') {
                if (imageUrlResult.value) {
                    setImageUrl(imageUrlResult.value);
                } else {
                    // API call succeeded but returned no image data, which is an error for us
                    setImageError('No se pudo generar la ilustración para este proceso.');
                }
            } else {
                // The API call for the image failed
                console.error("Error generating image:", imageUrlResult.reason);
                setImageError('Ocurrió un error al generar la ilustración.');
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Ocurrió un error al procesar la solicitud. Por favor, intente de nuevo.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleHistoryClick = (historicQuery: string) => {
        setQuery(historicQuery);
        handleSearch(historicQuery);
    };

    const handlePrint = async () => {
        const element = printRef.current;
        if (!element || typeof jspdf === 'undefined' || typeof html2canvas === 'undefined') {
            console.error("PDF generation libraries not found.");
            return;
        };
    
        const { jsPDF } = jspdf;
        
        const canvas = await html2canvas(element, {
            scale: 2, // Higher scale for better resolution
            backgroundColor: '#374151' // Match result background (gray-700)
        });
    
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
    
        // PDF setup in Letter format (points)
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'letter'
        });
    
        const pdfPageWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        
        // Define margins (e.g., 0.5 inch = 36 points)
        const margin = 36;
        
        const usableWidth = pdfPageWidth - (margin * 2);
        const usableHeight = pdfPageHeight - (margin * 2);
        
        const ratio = imgHeight / imgWidth;
        const scaledImgHeight = usableWidth * ratio;
        
        let heightLeft = scaledImgHeight;
        let position = 0;
        
        // Add the first page
        pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, scaledImgHeight);
        heightLeft -= usableHeight;
        
        // Add subsequent pages if content is longer than one page
        while (heightLeft > 0) {
            position -= usableHeight;
            pdf.addPage();
            // The y-coordinate is negative to "pan" down the tall image
            pdf.addImage(imgData, 'PNG', margin, position + margin, usableWidth, scaledImgHeight);
            heightLeft -= usableHeight;
        }
        
        const fileName = `proceso_${query.replace(/\s+/g, '_').toLowerCase()}.pdf`;
        pdf.save(fileName);
    };

    return (
        <div className="min-h-screen text-gray-200 font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <div className="flex justify-center items-center gap-4 mb-4">
                        <BuildingIcon className="w-12 h-12 text-cyan-400"/>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
                            GUIA PROCESOS CONSTRUCTIVOS
                        </h1>
                    </div>
                    <p className="text-gray-400 text-lg">
                        Busque un proceso constructivo y obtenga un resumen técnico basado en la normativa colombiana.
                    </p>
                </header>

                <main>
                    <div className="mb-4">
                        <SearchBar
                            query={query}
                            setQuery={setQuery}
                            onSearch={handleSearch}
                            isLoading={isLoading}
                        />
                    </div>
                    
                    <SearchHistory history={searchHistory} onHistoryClick={handleHistoryClick} />

                    {!isLoading && !error && searchResult && (
                         <div className="flex justify-end mb-6">
                            <button
                                onClick={handlePrint}
                                className="flex items-center justify-center px-5 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 transition-colors duration-300"
                            >
                                <PrintIcon className="w-5 h-5 mr-2" />
                                Imprimir a PDF
                            </button>
                        </div>
                    )}

                    {isLoading && <Loader />}

                    {error && (
                        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center backdrop-blur-sm">
                            <p>{error}</p>
                        </div>
                    )}

                    {!isLoading && !error && searchResult && (
                        <ResultDisplay
                            searchResult={searchResult}
                            imageUrl={imageUrl}
                            imageError={imageError}
                            query={query}
                            printRef={printRef}
                        />
                    )}

                    {!isLoading && !searchResult && !error && (
                        <div className="text-center text-gray-500 mt-12">
                            <p>Ingrese una actividad de construcción para comenzar.</p>
                            <p className="text-sm">Ej: "Instalación de una viga de cimentación"</p>
                        </div>
                    )}
                </main>
                 <footer className="text-center mt-12 text-gray-600 text-sm">
                    <p>Desarrollado con IA. La información debe ser verificada por un profesional.</p>
                </footer>
            </div>
        </div>
    );
};

export default App;