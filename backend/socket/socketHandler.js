module.exports = (io) => {
  // Store connected users
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log('✅ New client connected:', socket.id);

    // Store user info
    socket.on('user-connected', (userData) => {
      connectedUsers.set(socket.id, userData);
      console.log(`User connected: ${userData.role} - ${userData.name || userData.hospitalId}`);
    });

    // Hospital joins their room
    socket.on('join-hospital', (hospitalId) => {
      socket.join(`hospital-${hospitalId}`);
      console.log(`Hospital ${hospitalId} joined room: ${socket.id}`);
    });

    // Ambulance joins room
    socket.on('join-ambulance', (ambulanceId) => {
      socket.join(`ambulance-${ambulanceId}`);
      console.log(`Ambulance ${ambulanceId} joined room: ${socket.id}`);
    });

    // Hospital updates capacity
    socket.on('update-capacity', (data) => {
      console.log('📊 Capacity updated:', data);
      
      // Broadcast to ALL connected clients
      io.emit('capacity-updated', {
        hospitalId: data.hospitalId,
        hospitalName: data.hospitalName,
        availableBeds: data.availableBeds,
        availableICU: data.availableICU,
        timestamp: data.timestamp || new Date()
      });
    });

    // New ambulance request
    socket.on('new-request', (data) => {
      console.log('🚑 New request for hospital:', data.hospitalId);
      
      // Send to specific hospital
      io.to(`hospital-${data.hospitalId}`).emit('incoming-patient', {
        requestId: data.requestId,
        patientAge: data.patientAge,
        patientGender: data.patientGender,
        condition: data.condition,
        severity: data.severity,
        requiredSpecialty: data.requiredSpecialty,
        vitals: data.vitals,
        eta: data.eta,
        ambulanceId: data.ambulanceId,
        paramedicName: data.paramedicName,
        paramedicPhone: data.paramedicPhone,
        ambulanceLocation: data.ambulanceLocation,
        timestamp: new Date()
      });
    });

    // Ambulance location update
    socket.on('ambulance-location', (data) => {
      console.log('📍 Ambulance location update:', data.ambulanceId);
      
      // Send to specific hospital
      io.to(`hospital-${data.hospitalId}`).emit('ambulance-tracking', {
        requestId: data.requestId,
        ambulanceId: data.ambulanceId,
        location: data.location,
        timestamp: data.timestamp || new Date()
      });
    });

    // Ambulance arrived
    socket.on('ambulance-arrived', (data) => {
      console.log('✅ Ambulance arrived:', data.ambulanceId);
      
      // Notify hospital
      io.to(`hospital-${data.hospitalId}`).emit('patient-arrived', {
        requestId: data.requestId,
        ambulanceId: data.ambulanceId,
        timestamp: new Date()
      });
    });

    // Hospital accepts/rejects patient
    socket.on('hospital-response', (data) => {
      console.log('🏥 Hospital response:', data.hospitalId, data.accepted);
      
      // Notify ambulance
      io.to(`ambulance-${data.ambulanceId}`).emit('hospital-responded', {
        hospitalId: data.hospitalId,
        hospitalName: data.hospitalName,
        accepted: data.accepted,
        message: data.message,
        timestamp: new Date()
      });
    });

    // Client disconnected
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        console.log(`❌ Client disconnected: ${user.role} - ${socket.id}`);
        connectedUsers.delete(socket.id);
      } else {
        console.log('❌ Client disconnected:', socket.id);
      }
    });
  });

  // Return io instance for use in other files if needed
  return io;
};