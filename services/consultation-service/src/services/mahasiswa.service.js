const mahasiswaRepository = require('../repositories/mahasiswa.repository');

// ================= DASHBOARD =================
exports.getDashboard = async ({ user }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: 'Hanya mahasiswa yang dapat mengakses endpoint ini' };
  }

  const userId = user.id;

  const [profile, bimbinganSemester, bimbinganTotal, chatbotCount, jadwalTerdekat, kalender] =
    await Promise.all([
      mahasiswaRepository.getDashboardData(userId),
      mahasiswaRepository.countBimbinganSemesterIni(userId),
      mahasiswaRepository.countBimbinganKeseluruhan(userId),
      mahasiswaRepository.countChatbotBulanIni(userId),
      mahasiswaRepository.getJadwalTerdekat(userId),
      mahasiswaRepository.getKalenderBimbingan(userId),
    ]);

  if (!profile) throw { status: 404, message: 'Data mahasiswa tidak ditemukan' };

  // Format semua jadwal bimbingan aktif yang sudah dipesan mahasiswa
  const jadwalFormatted = jadwalTerdekat.map(row => {
    const tgl = new Date(row.date);
    const dateStr = tgl.toISOString().split('T')[0]; // YYYY-MM-DD

    return {
      id:               row.id,
      date:             dateStr,
      start_time:       row.start_time?.slice(0, 5) || null,   // "10:00"
      end_time:         row.end_time?.slice(0, 5) || null,
      status:           'booked',
      mahasiswa_agenda: row.mahasiswa_agenda || null,
      keterangan:       row.keterangan || null,
    };
  });

  // Format kalender
  const kalenderFormatted = kalender.map(row => {
    const tgl = new Date(row.date);
    const dateStr = tgl.toISOString().split('T')[0];
    const isFuture = tgl >= new Date(new Date().setHours(0, 0, 0, 0));
    return {
      date:   dateStr,
      status: row.status === 'dibatalkan' ? 'dibatalkan'
              : isFuture ? 'booked'
              : 'selesai',
    };
  });

  return {
    nama_mahasiswa:         profile.nama_mahasiswa || null,
    npm_mahasiswa:          profile.npm_mahasiswa || null,
    foto_mahasiswa:         profile.foto_mahasiswa || null,
    dosen_pa:               profile.dosen_pa || null,
    nip_dosen:              profile.nip_dosen || null,
    foto_dosen:             profile.foto_dosen || null,
    ipk:                    profile.ipk ? parseFloat(profile.ipk) : null,
    semester_saat_ini:      parseInt(profile.current_semester) || 0,
    bimbingan_semester_ini: bimbinganSemester,
    bimbingan_keseluruhan:  bimbinganTotal,
    chatbot_bulan_ini:      chatbotCount,
    jadwal_terdekat:        jadwalFormatted,
    kalender_bimbingan:     kalenderFormatted,
  };
};
