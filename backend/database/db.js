import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

// Memory cache & write queue to prevent concurrent file write corruptions
let dbCache = null;
let writeQueue = Promise.resolve();

// Initialize empty DB structures if not existing
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      challenges: [],
      tasks: [],
      messages: [],
      settings: { systemTimeOffset: 0 } // Used to simulate days shifting
    };
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    dbCache = initialData;
  }
}

// Thread-safe async read
export async function readDb() {
  if (dbCache) return dbCache;
  initDb();
  try {
    const data = await fs.promises.readFile(DB_FILE, 'utf8');
    dbCache = JSON.parse(data);
    return dbCache;
  } catch (err) {
    console.error('Error reading database file:', err);
    return { users: [], challenges: [], tasks: [], messages: [], settings: { systemTimeOffset: 0 } };
  }
}

// Thread-safe queue-based write
export async function writeDb(data) {
  dbCache = data;
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      try {
        await fs.promises.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
        resolve();
      } catch (err) {
        console.error('Error writing to database file:', err);
        reject(err);
      }
    });
  });
}

// Database helper functions
export const db = {
  async getCollection(name) {
    const data = await readDb();
    return data[name] || [];
  },

  async find(name, filterFn) {
    const list = await this.getCollection(name);
    return filterFn ? list.filter(filterFn) : list;
  },

  async findOne(name, filterFn) {
    const list = await this.getCollection(name);
    return list.find(filterFn) || null;
  },

  async insert(name, item) {
    const data = await readDb();
    if (!data[name]) data[name] = [];
    
    // Generate id
    const newItem = {
      id: Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
      ...item
    };
    data[name].push(newItem);
    await writeDb(data);
    return newItem;
  },

  async update(name, filterFn, updates) {
    const data = await readDb();
    if (!data[name]) return [];
    
    const updatedItems = [];
    data[name] = data[name].map(item => {
      if (filterFn(item)) {
        const updated = { ...item, ...updates, updatedAt: new Date().toISOString() };
        updatedItems.push(updated);
        return updated;
      }
      return item;
    });

    if (updatedItems.length > 0) {
      await writeDb(data);
    }
    return updatedItems;
  },

  async updateOne(name, filterFn, updates) {
    const data = await readDb();
    if (!data[name]) return null;

    const index = data[name].findIndex(filterFn);
    if (index === -1) return null;

    const updated = { ...data[name][index], ...updates, updatedAt: new Date().toISOString() };
    data[name][index] = updated;
    await writeDb(data);
    return updated;
  },

  async delete(name, filterFn) {
    const data = await readDb();
    if (!data[name]) return false;

    const originalLength = data[name].length;
    data[name] = data[name].filter(item => !filterFn(item));
    
    const deleted = data[name].length < originalLength;
    if (deleted) {
      await writeDb(data);
    }
    return deleted;
  },

  // Custom function to get system time (with offsets for simulation)
  async getSystemTime() {
    const data = await readDb();
    const offset = (data.settings && data.settings.systemTimeOffset) || 0;
    const now = new Date();
    return new Date(now.getTime() + offset);
  },

  // Custom function to advance system time (by days)
  async advanceSystemTime(days) {
    const data = await readDb();
    if (!data.settings) data.settings = { systemTimeOffset: 0 };
    const millisecondsToAdd = days * 24 * 60 * 60 * 1000;
    data.settings.systemTimeOffset = (data.settings.systemTimeOffset || 0) + millisecondsToAdd;
    await writeDb(data);
    return this.getSystemTime();
  }
};

// Initialize DB immediately
initDb();
