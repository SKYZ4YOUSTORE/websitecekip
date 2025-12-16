// Install dulu: npm install express body-parser
const express = require('express');
const bodyParser = require('body-parser');
const dns = require('dns'); // Buat nyari IP dari domain
const net = require('net'); // Buat ngecek status port
const path = require('path');
const app = express();
const PORT = 3000;

// Konfigurasi Express
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); 

// Fungsi buat ngecek satu port
function checkPort(ip, port, timeout = 500) {
    return new Promise(resolve => {
        const socket = new net.Socket();
        socket.setTimeout(timeout); // Timeout cepat biar gak kelamaan

        socket.on('connect', () => {
            socket.destroy();
            resolve({ port, isOpen: true });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ port, isOpen: false });
        });

        socket.on('error', (err) => {
            // ECONNREFUSED biasanya berarti closed
            socket.destroy();
            resolve({ port, isOpen: false });
        });

        socket.connect(port, ip);
    });
}

// Router utama buat SCANNING
app.post('/scan', async (req, res) => {
    const { domain, ports } = req.body;

    if (!domain || !ports) {
        return res.status(400).json({ error: "Domain dan Ports wajib diisi, Tuan!" });
    }

    try {
        // 1. Resolve Domain ke IP
        const addresses = await dns.promises.resolve4(domain);
        const targetIp = addresses[0]; // Ambil IP pertama aja

        // 2. Siapkan Port yang mau di-scan
        const portList = ports.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p) && p > 0 && p <= 65535);

        if (portList.length === 0) {
             return res.status(400).json({ error: "Port tidak valid. Masukkan angka port yang benar." });
        }

        // 3. Lakukan Port Scanning secara paralel (biar cepat)
        const scanPromises = portList.map(port => checkPort(targetIp, port));
        const portResults = await Promise.all(scanPromises);

        // 4. Kirim Hasil Ganas ke Frontend
        res.json({
            message: "Pelacakan Selesai",
            domain: domain,
            ip: targetIp,
            portStatus: portResults
        });

    } catch (err) {
        if (err.code === 'ENOTFOUND') {
            return res.status(404).json({ error: `Domain ${domain} tidak ditemukan, Tuan. Cek lagi.` });
        }
        console.error("Error Ganas:", err);
        res.status(500).json({ error: "Terjadi error fatal di backend saat melacak." });
    }
});


// Server siap melayani
app.listen(PORT, () => {
    console.log(`😈 Mesin pelacak aktif di http://localhost:${PORT}. Mulai berburu IP target!`);
});
