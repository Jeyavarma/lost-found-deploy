import { NextRequest } from "next/server";

// We stream the raw multipart/form-data directly 
// to the external Express backend via the request body ReadableStream.

export async function POST(req: NextRequest) {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
        const targetUrl = `${backendUrl}/api/items`;

        // Forward the exact raw body and headers to Express
        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                // Forward the exact content-type to preserve the multipart boundary
                "content-type": req.headers.get("content-type") || "",
                "authorization": req.headers.get("authorization") || "",
            },
            // Stream the raw readable web stream
            body: req.body,
            // @ts-ignore - Required for Node.js fetch with ReadableStream bodies
            duplex: "half",
        });

        const data = await response.text();

        return new Response(data, {
            status: response.status,
            headers: { "Content-Type": response.headers.get("content-type") || "application/json" }
        });
    } catch (error: any) {
        console.error("Proxy Upload Error:", error);
        return new Response(JSON.stringify({ message: "Upload proxy failed", error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
