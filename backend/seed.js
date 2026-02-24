const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Hospital = require('./models/Hospital');
const User = require('./models/User');

dotenv.config();

const hospitals = [
  {
    name: "City General Hospital",
    location: {
      latitude: 28.6139,
      longitude: 77.2090,
      address: "123 Main Street, Connaught Place, Delhi"
    },
    contact: {
      phone: "+91-11-12345678",
      emergency: "+91-11-12345679"
    },
    capacity: {
      totalBeds: 200,
      availableBeds: 45,
      totalICU: 20,
      availableICU: 3,
      totalVentilators: 10,
      availableVentilators: 2
    },
    specialists: [
      { specialty: 'cardiology', available: true, onDuty: ['Dr. Sharma', 'Dr. Patel'] },
      { specialty: 'neurology', available: false, onDuty: [] },
      { specialty: 'orthopedics', available: true, onDuty: ['Dr. Kumar'] },
      { specialty: 'general-surgery', available: true, onDuty: ['Dr. Singh'] }
    ],
    equipment: {
      ctScan: true,
      mri: true,
      xray: true,
      cathLab: true,
      bloodBank: true,
      ventilator: true,
      oxygenSupply: true
    },
    currentLoad: 'moderate',
    status: 'active'
  },
  {
    name: "Metro Medical Center",
    location: {
      latitude: 28.5355,
      longitude: 77.3910,
      address: "456 Park Avenue, Sector 18, Noida"
    },
    contact: {
      phone: "+91-120-98765432",
      emergency: "+91-120-98765433"
    },
    capacity: {
      totalBeds: 150,
      availableBeds: 30,
      totalICU: 15,
      availableICU: 1,
      totalVentilators: 8,
      availableVentilators: 1
    },
    specialists: [
      { specialty: 'cardiology', available: false, onDuty: [] },
      { specialty: 'neurology', available: true, onDuty: ['Dr. Mehta'] },
      { specialty: 'orthopedics', available: true, onDuty: ['Dr. Reddy'] },
      { specialty: 'trauma', available: true, onDuty: ['Dr. Verma'] }
    ],
    equipment: {
      ctScan: true,
      mri: false,
      xray: true,
      cathLab: false,
      bloodBank: true,
      ventilator: true,
      oxygenSupply: true
    },
    currentLoad: 'high',
    status: 'active'
  },
  {
    name: "Samatha Multispeciality Hospital",
    location: {
      latitude: 28.7041,
      longitude: 80.5233059,
      address: "1-605b, Trunk Road, Mangalagiri, Andhra Pradesh 522503"
    },
    contact: {
      phone: "+91-11-87654321",
      emergency: "+91-11-87654322"
    },
    capacity: {
      totalBeds: 250,
      availableBeds: 60,
      totalICU: 25,
      availableICU: 0,
      totalVentilators: 12,
      availableVentilators: 0
    },
    specialists: [
      { specialty: 'cardiology', available: true, onDuty: ['Dr. Gupta'] },
      { specialty: 'neurology', available: true, onDuty: ['Dr. Joshi'] },
      { specialty: 'orthopedics', available: true, onDuty: ['Dr. Rao'] },
      { specialty: 'pediatrics', available: true, onDuty: ['Dr. Nair'] }
    ],
    equipment: {
      ctScan: true,
      mri: true,
      xray: true,
      cathLab: true,
      bloodBank: true,
      ventilator: true,
      oxygenSupply: true
    },
    currentLoad: 'critical',
    status: 'active'
  },
  {
    name: "Community Care Center",
    location: {
      latitude: 28.4595,
      longitude: 77.0266,
      address: "321 Community Lane, Sector 29, Gurgaon"
    },
    contact: {
      phone: "+91-124-55566677",
      emergency: "+91-124-55566678"
    },
    capacity: {
      totalBeds: 100,
      availableBeds: 20,
      totalICU: 10,
      availableICU: 2,
      totalVentilators: 5,
      availableVentilators: 1
    },
    specialists: [
      { specialty: 'general-surgery', available: true, onDuty: ['Dr. Kapoor'] },
      { specialty: 'orthopedics', available: false, onDuty: [] },
      { specialty: 'pediatrics', available: true, onDuty: ['Dr. Sharma'] }
    ],
    equipment: {
      ctScan: false,
      mri: false,
      xray: true,
      cathLab: false,
      bloodBank: true,
      ventilator: true,
      oxygenSupply: true
    },
    currentLoad: 'low',
    status: 'active'
  },
  {
    name: "Emergency Care Hospital",
    location: {
      latitude: 28.6692,
      longitude: 77.4538,
      address: "555 Emergency Road, Vaishali, Ghaziabad"
    },
    contact: {
      phone: "+91-120-44455566",
      emergency: "+91-120-44455567"
    },
    capacity: {
      totalBeds: 180,
      availableBeds: 50,
      totalICU: 18,
      availableICU: 5,
      totalVentilators: 9,
      availableVentilators: 3
    },
    specialists: [
      { specialty: 'trauma', available: true, onDuty: ['Dr. Malhotra', 'Dr. Khanna'] },
      { specialty: 'cardiology', available: true, onDuty: ['Dr. Batra'] },
      { specialty: 'neurology', available: false, onDuty: [] },
      { specialty: 'general-surgery', available: true, onDuty: ['Dr. Sethi'] }
    ],
    equipment: {
      ctScan: true,
      mri: false,
      xray: true,
      cathLab: true,
      bloodBank: true,
      ventilator: true,
      oxygenSupply: true
    },
    currentLoad: 'moderate',
    status: 'active'
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Clear existing data
    await Hospital.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing data');

    // Insert hospitals
    const insertedHospitals = await Hospital.insertMany(hospitals);
    console.log('Seeded hospitals');

    // Create demo users
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const users = [
      {
        name: "Raj Kumar",
        email: "paramedic@demo.com",
        password: hashedPassword,
        role: "paramedic",
        phone: "+91-9876543210",
        ambulanceId: "AMB-DL-001"
      },
      {
        name: "Priya Sharma",
        email: "hospital1@demo.com",
        password: hashedPassword,
        role: "hospital-staff",
        phone: "+91-9876543211",
        hospitalId: insertedHospitals[0]._id
      },
      {
        name: "Amit Verma",
        email: "hospital2@demo.com",
        password: hashedPassword,
        role: "hospital-staff",
        phone: "+91-9876543212",
        hospitalId: insertedHospitals[1]._id
      },
      {
        name: "Admin User",
        email: "admin@demo.com",
        password: hashedPassword,
        role: "admin",
        phone: "+91-9876543213"
      }
    ];

    await User.insertMany(users);
    console.log('Seeded users');

    console.log(`

 Database Seeded Successfully!    

 Hospitals: ${hospitals.length}                       
   Users: ${users.length}                           
                                       
   Demo Credentials:                   
   
   Paramedic:                          
    paramedic@demo.com                
    password123                      
                                       
   Hospital Staff (City General):      
   hospital1@demo.com               
   password123                      
                                       
   Hospital Staff (Metro Medical):     
    hospital2@demo.com               
   password123                      

    `);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDB();