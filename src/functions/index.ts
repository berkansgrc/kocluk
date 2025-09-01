
'use strict';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

// Initialize Firebase Admin SDK
const app = initializeApp();
const db = getFirestore(app);
const auth = getAuth(app);

/**
 * Creates a new student user in Firebase Authentication and a corresponding
 * document in the 'students' collection in Firestore.
 *
 * This function can only be called by an authenticated user who is an admin.
 */
export const createStudent = onCall(async (request) => {
  // Security Check 1: Ensure the caller is authenticated.
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated', 
      'Bu işlemi yapmak için giriş yapmalısınız.'
    );
  }

  // Security Check 2: Ensure the caller is an admin.
  // In a real production app, use custom claims for roles.
  if (request.auth.token.email !== 'berkan_1225@hotmail.com') {
    throw new HttpsError(
      'permission-denied', 
      'Bu işlemi yapmak için yönetici yetkiniz yok.'
    );
  }

  const { email, password, name, className } = request.data;

  // Validate required fields
  if (!email || !password || !name) {
    throw new HttpsError(
      'invalid-argument', 
      'Lütfen tüm gerekli alanları doldurun (isim, e-posta, şifre).'
    );
  }
  
  if (password.length < 6) {
      throw new HttpsError(
        'invalid-argument', 
        'Şifre en az 6 karakter olmalıdır.'
      );
  }

  let userRecord;
  try {
    // 1. Create user in Firebase Authentication
    userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });
  } catch (error: any) {
     console.error('Error creating auth user:', error);
     if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Bu e-posta adresi zaten kullanımda.');
    }
    throw new HttpsError('internal', 'Authentication kullanıcısı oluşturulurken bir hata oluştu.');
  }


  try {
    // 2. Create user document in Firestore with default values
    const studentData = {
      name,
      email,
      className: className || '', // Provide a default value if className is missing
      weeklyQuestionGoal: 100,
      studySessions: [],
      assignments: [],
      resources: [],
      weeklyPlan: [],
      isPlanNew: false,
      unlockedAchievements: [],
      calendarEvents: [],
    };
    
    await db.collection('students').doc(userRecord.uid).set(studentData);

    return { success: true, message: 'Öğrenci başarıyla oluşturuldu.', uid: userRecord.uid };

  } catch (error: any) {
    console.error('Error creating student document in Firestore:', error);
    // If Firestore write fails, we should ideally delete the created auth user for cleanup.
    await auth.deleteUser(userRecord.uid);
    throw new HttpsError('internal', 'Kullanıcı veritabanına kaydedilirken bir hata oluştu.');
  }
});
    