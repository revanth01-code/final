const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Hospital = require('./models/Hospital');
const User = require('./models/User');
const Ambulance = require('./models/Ambulance');
const Audit = require('./models/Audit');

dotenv.config();

const hospitals = [
  {
    name: "Demo Hospital",
    location: {
      latitude: 28.6135,
      longitude: 77.2090,
      address: "1 Demo Road, Central Demo City"
    },
    contact: {
      phone: "+91-11-00000000",
      emergency: "+91-11-00000001"
    },
    capacity: {
      totalBeds: 100,
      availableBeds: 50,
      totalICU: 10,
      availableICU: 5,
      totalVentilators: 5,
      availableVentilators: 2
    },
    specialists: [
      { specialty: 'general-surgery', available: true, onDuty: ['Dr. Demo'] }
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
    await Ambulance.deleteMany({});
    await Audit.deleteMany({});
    console.log('Cleared existing data');

    // Drop indexes to ensure a clean slate, especially for geo indexes
    try {
      await Ambulance.collection.dropIndexes();
      console.log('Dropped ambulance indexes');
    } catch (error) {
      if (error.code === 26) { // IndexNotFound
        console.log('No ambulance indexes to drop.');
      } else {
        throw error;
      }
    }

    // Insert hospitals
    const insertedHospitals = await Hospital.insertMany(hospitals);
    console.log('Seeded hospitals');

    // Insert ambulances
    const ambulances = [
      { licensePlate: "DL01AM1234", status: 'available' },
      { licensePlate: "DL01AM5678", status: 'available' },
      { licensePlate: "DL01AM9012", status: 'unavailable' }
    ];
    const insertedAmbulances = await Ambulance.insertMany(ambulances);
    console.log('Seeded ambulances');

    // Create admin and demo users
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const users = [
      // Admin user removed for demo
    ];

    // add demo paramedic, hospital staff and control-room users once hospitals/ambulances are inserted
    if (insertedAmbulances && insertedAmbulances.length > 0) {
      users.push({
        name: "Demo Paramedic",
        email: "paramedic@demo.com",
        password: hashedPassword,
        role: "paramedic",
        phone: "+91-1234567890",
        ambulanceId: insertedAmbulances[0]._id
      });
      console.log(`Seed: assigned ambulance ${insertedAmbulances[0].licensePlate} to Demo Paramedic`);
    }
    if (insertedHospitals && insertedHospitals.length > 0) {
      users.push({
        name: "Demo HospitalStaff",
        email: "hospital@demo.com",
        password: hashedPassword,
        role: "hospital-staff",
        phone: "+91-1098765432",
        hospitalId: insertedHospitals[0]._id
      });
    }
    users.push({
      name: "Demo Control",
      email: "control@demo.com",
      password: hashedPassword,
      role: "control-room",
      phone: "+91-9988776655"
    });

    await User.insertMany(users);
    console.log('Seeded users:', users.map(u=>u.email).join(', '));

    // insert a few sample requests so dashboards have something to display
    try {
      const Request = require('./models/Request');
      const demoRequests = [
        {
          ambulance: insertedAmbulances[0]._id,
          paramedic: { name: 'Demo Paramedic', phone: '+91-1234567890' },
          patient: {
            age: 60,
            gender: 'male',
            condition: 'chest pain',
            severity: 'severe',
            vitals: { heartRate: 110, bloodPressure: '140/90', oxygenLevel: 94, temperature: 98.6 },
            symptoms: ['pain', 'nausea'],
            requiredSpecialty: 'cardiology',
            consciousness: 'alert'
          },
          location: { latitude: 28.6135, longitude: 77.2090 },
          status: 'requested'
        },
        {
          ambulance: insertedAmbulances[1]._id,
          paramedic: { name: 'Demo Paramedic 2', phone: '+91-1122334455' },
          patient: {
            age: 25,
            gender: 'female',
            condition: 'broken leg',
            severity: 'moderate',
            vitals: { heartRate: 88, bloodPressure: '120/80', oxygenLevel: 98, temperature: 98.4 },
            symptoms: ['pain', 'swelling'],
            requiredSpecialty: 'orthopedics',
            consciousness: 'alert'
          },
          location: { latitude: 28.6136, longitude: 77.2085 },
          status: 'requested'
        }
      ];
      await Request.insertMany(demoRequests);
      console.log('Seeded demo requests');
    } catch (reqError) {
      console.error('Error seeding requests:', reqError);
    }

    console.log(`

 Database Seeded Successfully!    

 Hospitals: ${hospitals.length}
 Ambulances: ${ambulances.length}
   Users: ${users.length} (Admin only)                           
                                       
   Admin Credentials:                  
   Email: admin@demo.com                
   Pass:  password123                      

    `);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDB();