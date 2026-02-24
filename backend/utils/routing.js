// Haversine formula for calculating distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // Distance in kilometers
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Calculate match score based on multiple factors
function calculateMatchScore(hospital, patientCondition) {
  let score = 100;

  // Factor 1: Specialty Available (40 points)
  const requiredSpecialty = patientCondition.requiredSpecialty;
  const hasSpecialist = hospital.specialists.find(
    s => s.specialty === requiredSpecialty && s.available
  );
  
  if (!hasSpecialist) {
    score -= 40;
  }

  // Factor 2: Bed Availability (30 points)
  if (patientCondition.severity === 'critical' || patientCondition.severity === 'severe') {
    // Need ICU bed
    if (hospital.capacity.availableICU === 0) {
      score -= 30;
    } else if (hospital.capacity.availableICU < 2) {
      score -= 15;
    }
  } else {
    // Need general bed
    if (hospital.capacity.availableBeds === 0) {
      score -= 30;
    } else if (hospital.capacity.availableBeds < 5) {
      score -= 15;
    }
  }

  // Factor 3: Hospital Load (15 points)
  switch (hospital.currentLoad) {
    case 'critical':
      score -= 15;
      break;
    case 'high':
      score -= 10;
      break;
    case 'moderate':
      score -= 5;
      break;
    case 'low':
      // No penalty
      break;
  }

  // Factor 4: Equipment (15 points)
  const requiredEquipment = getRequiredEquipment(patientCondition.condition);
  requiredEquipment.forEach(equip => {
    if (!hospital.equipment[equip]) {
      score -= 5;
    }
  });

  return Math.max(score, 0); // Minimum score is 0
}

// Get required equipment based on condition
function getRequiredEquipment(condition) {
  const equipmentMap = {
    'cardiac-arrest': ['cathLab', 'bloodBank'],
    'stroke': ['ctScan', 'mri'],
    'trauma': ['xray', 'ctScan', 'bloodBank'],
    'accident': ['xray', 'ctScan', 'bloodBank'],
    'respiratory': ['ventilator', 'oxygenSupply'],
    'burns': ['bloodBank'],
    'poisoning': ['bloodBank'],
    'seizure': ['ctScan', 'mri']
  };
  
  return equipmentMap[condition] || [];
}

// Generate reasons for recommendation
function generateReasons(hospital, patientCondition, matchScore) {
  const reasons = [];

  // Reason 1: Specialty
  const requiredSpecialty = patientCondition.requiredSpecialty;
  const specialist = hospital.specialists.find(
    s => s.specialty === requiredSpecialty && s.available
  );
  
  if (specialist) {
    const specialtyName = requiredSpecialty.charAt(0).toUpperCase() + requiredSpecialty.slice(1);
    reasons.push(`${specialtyName} specialist available`);
  } else {
    reasons.push(`No ${requiredSpecialty} specialist on duty`);
  }

  // Reason 2: Beds
  if (patientCondition.severity === 'critical' || patientCondition.severity === 'severe') {
    if (hospital.capacity.availableICU > 2) {
      reasons.push(`ICU bed available (${hospital.capacity.availableICU} free)`);
    } else if (hospital.capacity.availableICU > 0) {
      reasons.push(`Limited ICU availability (${hospital.capacity.availableICU} free)`);
    } else {
      reasons.push('No ICU beds available');
    }
  } else {
    if (hospital.capacity.availableBeds > 10) {
      reasons.push(`Good bed availability (${hospital.capacity.availableBeds} free)`);
    } else if (hospital.capacity.availableBeds > 0) {
      reasons.push(`Limited beds (${hospital.capacity.availableBeds} free)`);
    }
  }

  // Reason 3: Load
  switch (hospital.currentLoad) {
    case 'low':
      reasons.push('Low patient load - quick service');
      break;
    case 'moderate':
      reasons.push('Moderate patient load');
      break;
    case 'high':
      reasons.push('High patient load - may have delays');
      break;
    case 'critical':
      reasons.push('Very high load - significant delays expected');
      break;
  }

  // Reason 4: Equipment
  const requiredEquipment = getRequiredEquipment(patientCondition.condition);
  const hasAllEquipment = requiredEquipment.every(equip => hospital.equipment[equip]);
  
  if (hasAllEquipment && requiredEquipment.length > 0) {
    reasons.push('All required equipment available');
  } else if (requiredEquipment.length > 0) {
    reasons.push('Some required equipment may not be available');
  }

  return reasons;
}

// Main recommendation function
async function recommendHospitals(hospitals, patientLocation, patientCondition) {
  const recommendations = [];

  for (const hospital of hospitals) {
    // Calculate distance
    const distance = calculateDistance(
      patientLocation.latitude,
      patientLocation.longitude,
      hospital.location.latitude,
      hospital.location.longitude
    );

    // Calculate ETA (rough estimate: 3 minutes per km in city traffic)
    const eta = Math.ceil(distance * 3);

    // Calculate match score
    const matchScore = calculateMatchScore(hospital, patientCondition);

    // Generate reasons
    const reasons = generateReasons(hospital, patientCondition, matchScore);

    recommendations.push({
      hospitalId: hospital._id,
      hospitalName: hospital.name,
      hospitalAddress: hospital.location.address,
      hospitalPhone: hospital.contact.phone,
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
      eta,
      matchScore,
      reasons,
      availableBeds: hospital.capacity.availableBeds,
      availableICU: hospital.capacity.availableICU,
      currentLoad: hospital.currentLoad,
      location: hospital.location
    });
  }

  // Sort by composite score: match score (70%) + distance factor (30%)
  recommendations.sort((a, b) => {
    // Distance factor: closer is better (max 20km considered)
    const distanceFactorA = Math.max(0, (20 - a.distance) / 20 * 30);
    const distanceFactorB = Math.max(0, (20 - b.distance) / 20 * 30);
    
    const compositeScoreA = (a.matchScore * 0.7) + distanceFactorA;
    const compositeScoreB = (b.matchScore * 0.7) + distanceFactorB;
    
    return compositeScoreB - compositeScoreA;
  });

  // Return top 5 recommendations
  return recommendations.slice(0, 5);
}

module.exports = {
  calculateDistance,
  calculateMatchScore,
  recommendHospitals,
  generateReasons
};