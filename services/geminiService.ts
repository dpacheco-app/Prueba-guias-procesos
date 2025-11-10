import { GoogleGenAI, Modality } from "@google/genai";
import type { GroundingChunk, SearchResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

const textModel = 'gemini-2.5-pro';
const imageModel = 'gemini-2.5-flash-image';

export async function fetchConstructionProcess(query: string): Promise<SearchResult> {
    const prompt = `
        Eres un asistente experto en ingeniería civil y arquitectura especializado en normatividad de construcción colombiana.

        Para la siguiente actividad de construcción: "${query}"

        Genera una respuesta detallada y técnica en español con la siguiente estructura:
        
        1.  **Descripción del Proceso:** Una explicación clara y concisa de la actividad.
        2.  **Pasos Clave para el Éxito:** Una lista numerada de los pasos más importantes a seguir, en orden cronológico.
        3.  **Parámetros y Materiales:** Información puntual, exacta y precisa sobre materiales, dosificaciones y control de calidad.
        4.  **Normatividad Aplicable:** Un apartado específico y claro bajo este título exacto. Aquí debes resumir las normas clave que aplican al proceso descrito, explicando brevemente su incumbencia.

        **REQUISITOS INDISPENSABLES:**
        *   **Citas Inline:** Toda la información en los puntos 1, 2 y 3 debe estar rigurosamente soportada y citar explícitamente las normas colombianas cuando apliquen. Para cada paso, parámetro, material o dosificación, debes indicar de forma explícita y junto a la descripción, cuál norma específica (y si es posible, qué artículo o sección) lo respalda. Por ejemplo: "El concreto debe tener una resistencia de 21 MPa (NSR-10, Título C.5.2)". La conexión entre la información y la norma debe ser directa e inequívoca.
        *   **Condicional de Normatividad:** Si después de tu análisis, ninguna de las normativas de la lista aplica directamente al proceso consultado, DEBES OMITIR POR COMPLETO la sección "Normatividad Aplicable". No escribas "No aplica" ni nada similar; simplemente no incluyas el título ni la sección.
        *   **Formato Markdown:** Utiliza formato Markdown para la respuesta. Usa encabezados de nivel 1 (#) y 2 (##) únicamente. No uses encabezados de nivel 3 (###) o inferiores.

        **Lista de normativas de referencia obligatoria:**
        *   NSR-10
        *   Normas Técnicas Colombianas (NTC)
        *   Normas ICONTEC
        *   Reglamento Técnico del Sector de Agua Potable y Saneamiento Básico (RAS)
        *   Reglamento Técnico de Instalaciones Eléctricas (RETIE)
        *   Reglamento Técnico de Iluminación y Alumbrado Público (RETILAP)
        *   Reglamento Técnico para Redes Internas de Telecomunicaciones (RITEL)
    `;
    
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] || [];

    return { text, sources };
}


export async function generateProcessImage(query: string): Promise<string | null> {
    const prompt = `Crea un dibujo técnico o un esquema ilustrativo a color, claro y detallado, que represente el proceso constructivo de: "${query}". El estilo debe ser como un diagrama profesional de un manual de construcción. Es indispensable que la ilustración sea a color, utilizando una paleta de colores clara para diferenciar materiales y etapas. La generación de esta imagen es un requisito obligatorio. IMPORTANTE: Todo el texto, etiquetas y anotaciones dentro del dibujo DEBEN ESTAR EN ESPAÑOL.`;
    
    try {
        const response = await ai.models.generateContent({
            model: imageModel,
            contents: {
                parts: [{ text: prompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        return null;

    } catch (error) {
        console.error("Error generating image:", error);
        return null;
    }
}
