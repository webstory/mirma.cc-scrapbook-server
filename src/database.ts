import { MongoClient } from 'mongodb';
import config from './config';

const mongoClient = new MongoClient(config.db.mongodb);
export const db = mongoClient.db(config.db.dbname);
export const files = db.collection('files');
export const pools = db.collection('pools');

process.on('SIGTERM', async () => {
  await mongoClient.close();
});
