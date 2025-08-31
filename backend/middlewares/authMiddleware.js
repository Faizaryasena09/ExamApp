const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token tidak ditemukan. Akses ditolak.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                // Jika Access Token kedaluwarsa, coba perbarui menggunakan Refresh Token
                const refreshToken = req.cookies.refreshToken;
                if (!refreshToken) {
                    return res.status(401).json({ message: 'Sesi berakhir. Silakan login kembali.' });
                }

                jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (errRefresh, decodedRefresh) => {
                    if (errRefresh) {
                        // Jika Refresh Token juga tidak valid, logout pengguna
                        return res.status(401).json({ message: 'Sesi berakhir. Silakan login kembali.' });
                    }

                    // Refresh Token valid, buat Access Token baru
                    const newAccessToken = jwt.sign(
                        {
                            userId: decodedRefresh.userId,
                            name: decoded.name, // Ambil info dari token lama yang kedaluwarsa
                            role: decoded.role
                        },
                        process.env.JWT_SECRET,
                        { expiresIn: '15m' } // Buat token baru dengan masa berlaku singkat
                    );
                    
                    // Atur cookie baru untuk response, agar request selanjutnya oleh browser menggunakan token baru
                    res.cookie('token', newAccessToken, { 
                        // httpOnly: false agar bisa dibaca oleh JS di frontend (sesuai struktur asli)
                        expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Samakan dengan expire asli
                    });

                    // Ganti token di header request saat ini agar request yang sekarang bisa diproses
                    req.headers['authorization'] = `Bearer ${newAccessToken}`;
                    
                    // Simpan info user di request untuk digunakan oleh middleware/controller selanjutnya
                    req.user = { userId: decodedRefresh.userId, name: decoded.name, role: decoded.role };
                    
                    next(); // Lanjutkan request yang tadinya gagal
                });
            } else {
                // Error lain pada token (bukan kedaluwarsa)
                return res.status(403).json({ message: 'Token tidak valid.' });
            }
        } else {
            // Token valid, lanjutkan request
            req.user = decoded;
            next();
        }
    });
};

module.exports = verifyToken;
