// const app = express(); <-- O'CHIRING
// app.use(cors());     <-- O'CHIRING

export default function logger(req, res, next) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
}