import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import {generateKey} from './keys/flexKeys';

dotenv.config();

const app = express();
const port = process.env.CONFIG_PORT;
app.use(cors());

app.listen(port, () => {
    console.log(`Application running on port:${port}`);
});

app.post('/keys', async(req, res) => {
    const keysResult = await generateKey();
    if(keysResult){
        res.send(keysResult);
    } else {
        res.sendStatus(500);
    }
});