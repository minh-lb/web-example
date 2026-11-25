import { Database } from './database';
import { today } from '../domain/policy';

const timestamps = 'created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP';
const schema = [
  'CREATE TABLE IF NOT EXISTS services (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, slug VARCHAR(255) UNIQUE NOT NULL, name VARCHAR(255) NOT NULL, description TEXT NOT NULL, category VARCHAR(255) NOT NULL, duration_minutes INT UNSIGNED NOT NULL, price INT UNSIGNED NOT NULL, color VARCHAR(255) NOT NULL DEFAULT "indigo", active BOOLEAN NOT NULL DEFAULT TRUE, '+timestamps+') ENGINE=InnoDB',
  'CREATE TABLE IF NOT EXISTS customers (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, phone VARCHAR(255) NOT NULL, '+timestamps+') ENGINE=InnoDB',
  'CREATE TABLE IF NOT EXISTS bookings (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reference VARCHAR(255) UNIQUE NOT NULL, service_id BIGINT UNSIGNED NOT NULL, customer_id BIGINT UNSIGNED NOT NULL, date VARCHAR(255) NOT NULL, time_slot VARCHAR(255) NOT NULL, status VARCHAR(255) NOT NULL DEFAULT "CONFIRMED", notes TEXT NOT NULL, created_by VARCHAR(255) NOT NULL, '+timestamps+', FOREIGN KEY(service_id) REFERENCES services(id), FOREIGN KEY(customer_id) REFERENCES customers(id), INDEX(service_id,date,time_slot), INDEX(status,date)) ENGINE=InnoDB',
  'CREATE TABLE IF NOT EXISTS background_jobs (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, type VARCHAR(255) NOT NULL DEFAULT "DEMO", booking_id BIGINT UNSIGNED NULL UNIQUE, status VARCHAR(255) NOT NULL DEFAULT "PENDING", attempts INT UNSIGNED NOT NULL DEFAULT 0, max_attempts INT UNSIGNED NOT NULL DEFAULT 3, fail_until_attempt INT UNSIGNED NOT NULL DEFAULT 0, last_error TEXT NULL, result TEXT NULL, completed_at TIMESTAMP NULL, '+timestamps+', FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE, INDEX(status,id)) ENGINE=InnoDB',
];
export async function initialize(db:Database) { for (const sql of schema) await db.write(sql); await seed(db); }
export async function seed(db:Database) {
  const services = [
    ['consultation','Personal consultation','A focused one-to-one strategy session tailored to your goals.','Consultation',60,350000,'indigo'],
    ['wellness','Wellness session','Recharge with a guided mindfulness and wellbeing session.','Wellness',90,490000,'rose'],
    ['career','Career coaching','Find clarity on your next career move with an experienced coach.','Coaching',60,420000,'amber'],
    ['design','Design review','Walk through your product design with practical feedback.','Consultation',45,280000,'cyan'],
    ['fitness','Fitness assessment','Baseline assessment and a personalized training plan.','Wellness',45,300000,'emerald'],
    ['nutrition','Nutrition planning','A realistic nutrition plan based on your schedule.','Wellness',60,390000,'violet'],
  ];
  const customers = [['Sophia Nguyen','sophia@example.com','0901123456'],['Daniel Tran','daniel@example.com','0902234567'],['Emma Le','emma@example.com','0903345678'],['Oliver Pham','oliver@example.com','0904456789']];
  await db.transaction(async c => {
    const serviceIds:number[] = [], customerIds:number[] = [];
    for (const row of services) {
      await db.write('INSERT INTO services (slug,name,description,category,duration_minutes,price,color,created_at,updated_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE id=id',row,c);
      serviceIds.push(Number((await db.rows('SELECT id FROM services WHERE slug=?',[row[0]],c))[0].id));
    }
    for (const row of customers) {
      await db.write('INSERT INTO customers (name,email,phone,created_at,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE id=id',row,c);
      customerIds.push(Number((await db.rows('SELECT id FROM customers WHERE email=?',[row[1]],c))[0].id));
    }
    for(let i=0;i<8;i++) await db.write('INSERT INTO bookings (reference,service_id,customer_id,date,time_slot,status,notes,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE id=id',
      ['DEMO-'+String(i+1).padStart(3,'0'),serviceIds[i%6],customerIds[i%4],today(1+Math.floor(i/3)),['09:00','10:00','14:00'][i%3],i===4?'COMPLETED':i===7?'CANCELED':'CONFIRMED',i===0?'First-time guest':'','demo-seed'],c);
  });
  await db.invalidateServices();
}
export function assertTestDatabase() { if (!process.env.DB_DATABASE?.endsWith('_test')) throw new Error('Refusing to modify fixtures outside an isolated _test database'); }
export async function reset(db:Database) {
  assertTestDatabase();
  await db.transaction(async c => { for (const table of ['background_jobs','bookings','customers','services']) await db.write('DELETE FROM '+table,[],c); });
  await seed(db);
}
