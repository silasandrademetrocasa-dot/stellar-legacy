import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (req, res) => {
  res.json({ ok: true, game: 'Stellar Legacy', version: '2.1.0' });
});

app.get('/api/meta', (req, res) => {
  res.json({
    name: 'Stellar Legacy',
    version: '2.1.0',
    features: ['ships', 'maps_x1_to_x4', 'laser_ammo', 'rockets', 'auto_laser', 'auto_rocket', 'turbo_rocket', 'classic_shortcuts', 'hangar'],
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Stellar Legacy V2.1 on :${port}`));
