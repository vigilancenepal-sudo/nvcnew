import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Server-side Gemini AI Report Summary Endpoint
  app.post('/api/ai-report', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY कन्फिगर गरिएको छैन। कृपया Secrets प्यानलमा जाँच गर्नुहोस्।',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const { statsSummary, shakhaBreakdown, topMinistries, fiscalYear } = req.body || {};

      const prompt = `तपाईं राष्ट्रिय सतर्कता केन्द्र (National Vigilance Centre, Nepal) को वरिष्ठ विश्लेषक हुनुहुन्छ।
दिइएको तथ्याङ्कको आधारमा नेपाली भाषामा औपचारिक, संक्षिप्त र कार्यमूलक "स्वतः विश्लेषण प्रतिवेदन (AI Analytical Report)" तयार पार्नुहोस्।

आर्थिक वर्ष: ${fiscalYear || '२०८३/८४'}
समग्र सारांश: ${JSON.stringify(statsSummary || {})}
शाखागत विवरण: ${JSON.stringify(shakhaBreakdown || [])}
मुख्य मन्त्रालयगत उजुरीहरू: ${JSON.stringify(topMinistries || [])}

प्रतिवेदनमा निम्न ४ खण्डहरू स्पष्ट शीर्षकसहित समावेश गर्नुहोस्:
१. समग्र उजुरी तथा फर्छ्यौट अवस्थाको विश्लेषण
२. शाखागत र मन्त्रालयगत मुख्य प्रवृत्तिहरू
३. जोखिम क्षेत्र तथा प्राथमिकता दिनुपर्ने विषयहरू
४. सुधारका लागि ठोस सुझाव र आगामी कार्यदिशा`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      return res.json({
        analysis: response.text || 'विश्लेषण उपलब्ध हुन सकेन।',
      });
    } catch (error: any) {
      console.error('Gemini API Report Error:', error);
      return res.status(500).json({
        error: error?.message || 'AI रिपोर्ट जेनरेट गर्दा सर्भरमा त्रुटि भयो।',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NVC-IMS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
