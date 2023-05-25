import * as dotenv from 'dotenv';

dotenv.config();

const config = process.env as { [key: string]: string };

export default config;
