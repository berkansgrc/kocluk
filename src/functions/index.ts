
'use strict';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

// Initialize Firebase Admin SDK
initializeApp();

export const createStudent = onCall(async (request) => {
  // Check if the user is an admin (implement your own logic)
  if (request.auth?.token.email !== 'berkan_1225@hotmail.com') {
    throw new HttpsError('unauthenticated', 'Bu işlemi yapmak için yönetici yetkiniz yok.');
  }

  const { email, password, name, className } = request.data;

  if (!email || !password || !name) {
    throw new HttpsError('invalid-argument', 'Lütfen tüm gerekli alanları doldurun (isim, e-posta, şifre).');
  }

  try {
    // Create user in Firebase Authentication
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: name,
    });

    // Create user document in Firestore
    await getFirestore().collection('students').doc(userRecord.uid).set({
      name,
      email,
      className: className || '',
      weeklyQuestionGoal: 100, // Default weekly goal
      studySessions: [],
      assignments: [],
      resources: [],
      weeklyPlan: [],
      isPlanNew: false,
      unlockedAchievements: [],
      calendarEvents: [],
    });

    return { success: true, message: 'Öğrenci başarıyla oluşturuldu.', uid: userRecord.uid };
  } catch (error: any) {
    console.error('Error creating new student:', error);
    // Provide a more user-friendly error message
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Bu e-posta adresi zaten kullanımda.');
    }
    throw new HttpsError('internal', 'Kullanıcı oluşturulurken bir sunucu hatası oluştu.', error);
  }
});

    