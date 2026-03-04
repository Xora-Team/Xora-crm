import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for departure notification
  app.post("/api/notify-departure", (req, res) => {
    const { employeeName, departureDate, companyName } = req.body;
    
    console.log(`[EMAIL NOTIFICATION] To: bonjour@xora.fr`);
    console.log(`Subject: Notification de départ - ${employeeName}`);
    console.log(`Body: Le collaborateur ${employeeName} de la société ${companyName} a quitté l'entreprise le ${departureDate}. Sa licence Xora a été désactivée.`);

    // In a real production app, you would use nodemailer here:
    /*
    const transporter = nodemailer.createTransport({...});
    await transporter.sendMail({
      from: '"Xora CRM" <noreply@xora.fr>',
      to: "bonjour@xora.fr",
      subject: `Notification de départ - ${employeeName}`,
      text: `Le collaborateur ${employeeName} de la société ${companyName} a quitté l'entreprise le ${departureDate}. Sa licence Xora a été désactivée.`
    });
    */

    res.json({ success: true, message: "Notification logged" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
