// const app = express(); <-- BU QATORNI O'CHIRING
// app.use(cors());     <-- BU QATORNI HAM O'CHIRING

export default function auth(req, res, next) {
    // Kelayotgan so'rovlarni tekshirish logikasi
    const userId = req.headers['x-user-id'] || req.query.userId;
    if (userId) {
        req.userId = userId;
    }
    next();
}