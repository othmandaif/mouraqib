import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tribunaux = [
    // ─── Casablanca ──────────────────────────────────────────────────────────
    { code: 'TPI_CASA_ANFA', nom: 'TPI Casablanca Anfa', nomAr: 'المحكمة الابتدائية الدار البيضاء عنفا', ville: 'Casablanca', type: 'TPI' },
    { code: 'TPI_CASA_HAY_MOHAMMADI', nom: 'TPI Casablanca Hay Mohammadi', nomAr: 'المحكمة الابتدائية الدار البيضاء الحي المحمدي', ville: 'Casablanca', type: 'TPI' },
    { code: 'TPI_CASA_AIN_SEBAA', nom: 'TPI Casablanca Ain Sebaa', nomAr: 'المحكمة الابتدائية الدار البيضاء عين السبع', ville: 'Casablanca', type: 'TPI' },
    { code: 'TPI_CASA_BEN_MSIK', nom: 'TPI Casablanca Ben Msik', nomAr: 'المحكمة الابتدائية الدار البيضاء بن مسيك', ville: 'Casablanca', type: 'TPI' },
    { code: 'CA_CASA', nom: 'Cour d\'Appel de Casablanca', nomAr: 'محكمة الاستئناف الدار البيضاء', ville: 'Casablanca', type: 'CA' },
    { code: 'TC_CASA', nom: 'Tribunal de Commerce de Casablanca', nomAr: 'المحكمة التجارية الدار البيضاء', ville: 'Casablanca', type: 'TC' },
    { code: 'CA_COMMERCE_CASA', nom: 'Cour d\'Appel de Commerce de Casablanca', nomAr: 'محكمة الاستئناف التجارية الدار البيضاء', ville: 'Casablanca', type: 'CA' },
    { code: 'TA_CASA', nom: 'Tribunal Administratif de Casablanca', nomAr: 'المحكمة الإدارية الدار البيضاء', ville: 'Casablanca', type: 'TA' },

    // ─── Rabat ───────────────────────────────────────────────────────────────
    { code: 'TPI_RABAT', nom: 'TPI Rabat', nomAr: 'المحكمة الابتدائية الرباط', ville: 'Rabat', type: 'TPI' },
    { code: 'TPI_SALE', nom: 'TPI Salé', nomAr: 'المحكمة الابتدائية سلا', ville: 'Salé', type: 'TPI' },
    { code: 'CA_RABAT', nom: 'Cour d\'Appel de Rabat', nomAr: 'محكمة الاستئناف الرباط', ville: 'Rabat', type: 'CA' },
    { code: 'TC_RABAT', nom: 'Tribunal de Commerce de Rabat', nomAr: 'المحكمة التجارية الرباط', ville: 'Rabat', type: 'TC' },
    { code: 'TA_RABAT', nom: 'Tribunal Administratif de Rabat', nomAr: 'المحكمة الإدارية الرباط', ville: 'Rabat', type: 'TA' },
    { code: 'TCS_RABAT', nom: 'Tribunal de la Famille de Rabat', nomAr: 'محكمة الأسرة الرباط', ville: 'Rabat', type: 'TCS' },

    // ─── Marrakech ───────────────────────────────────────────────────────────
    { code: 'TPI_MARRAKECH', nom: 'TPI Marrakech', nomAr: 'المحكمة الابتدائية مراكش', ville: 'Marrakech', type: 'TPI' },
    { code: 'CA_MARRAKECH', nom: 'Cour d\'Appel de Marrakech', nomAr: 'محكمة الاستئناف مراكش', ville: 'Marrakech', type: 'CA' },
    { code: 'TC_MARRAKECH', nom: 'Tribunal de Commerce de Marrakech', nomAr: 'المحكمة التجارية مراكش', ville: 'Marrakech', type: 'TC' },
    { code: 'TA_MARRAKECH', nom: 'Tribunal Administratif de Marrakech', nomAr: 'المحكمة الإدارية مراكش', ville: 'Marrakech', type: 'TA' },

    // ─── Fès ─────────────────────────────────────────────────────────────────
    { code: 'TPI_FES', nom: 'TPI Fès', nomAr: 'المحكمة الابتدائية فاس', ville: 'Fès', type: 'TPI' },
    { code: 'CA_FES', nom: 'Cour d\'Appel de Fès', nomAr: 'محكمة الاستئناف فاس', ville: 'Fès', type: 'CA' },
    { code: 'TC_FES', nom: 'Tribunal de Commerce de Fès', nomAr: 'المحكمة التجارية فاس', ville: 'Fès', type: 'TC' },
    { code: 'TA_FES', nom: 'Tribunal Administratif de Fès', nomAr: 'المحكمة الإدارية فاس', ville: 'Fès', type: 'TA' },

    // ─── Meknès ──────────────────────────────────────────────────────────────
    { code: 'TPI_MEKNES', nom: 'TPI Meknès', nomAr: 'المحكمة الابتدائية مكناس', ville: 'Meknès', type: 'TPI' },
    { code: 'CA_MEKNES', nom: 'Cour d\'Appel de Meknès', nomAr: 'محكمة الاستئناف مكناس', ville: 'Meknès', type: 'CA' },
    { code: 'TA_MEKNES', nom: 'Tribunal Administratif de Meknès', nomAr: 'المحكمة الإدارية مكناس', ville: 'Meknès', type: 'TA' },

    // ─── Agadir ──────────────────────────────────────────────────────────────
    { code: 'TPI_AGADIR', nom: 'TPI Agadir', nomAr: 'المحكمة الابتدائية أكادير', ville: 'Agadir', type: 'TPI' },
    { code: 'CA_AGADIR', nom: 'Cour d\'Appel d\'Agadir', nomAr: 'محكمة الاستئناف أكادير', ville: 'Agadir', type: 'CA' },
    { code: 'TC_AGADIR', nom: 'Tribunal de Commerce d\'Agadir', nomAr: 'المحكمة التجارية أكادير', ville: 'Agadir', type: 'TC' },
    { code: 'TA_AGADIR', nom: 'Tribunal Administratif d\'Agadir', nomAr: 'المحكمة الإدارية أكادير', ville: 'Agadir', type: 'TA' },

    // ─── Tanger ──────────────────────────────────────────────────────────────
    { code: 'TPI_TANGER', nom: 'TPI Tanger', nomAr: 'المحكمة الابتدائية طنجة', ville: 'Tanger', type: 'TPI' },
    { code: 'CA_TANGER', nom: 'Cour d\'Appel de Tanger', nomAr: 'محكمة الاستئناف طنجة', ville: 'Tanger', type: 'CA' },
    { code: 'TC_TANGER', nom: 'Tribunal de Commerce de Tanger', nomAr: 'المحكمة التجارية طنجة', ville: 'Tanger', type: 'TC' },
    { code: 'TA_TANGER', nom: 'Tribunal Administratif de Tanger', nomAr: 'المحكمة الإدارية طنجة', ville: 'Tanger', type: 'TA' },

    // ─── Oujda ───────────────────────────────────────────────────────────────
    { code: 'TPI_OUJDA', nom: 'TPI Oujda', nomAr: 'المحكمة الابتدائية وجدة', ville: 'Oujda', type: 'TPI' },
    { code: 'CA_OUJDA', nom: 'Cour d\'Appel d\'Oujda', nomAr: 'محكمة الاستئناف وجدة', ville: 'Oujda', type: 'CA' },
    { code: 'TA_OUJDA', nom: 'Tribunal Administratif d\'Oujda', nomAr: 'المحكمة الإدارية وجدة', ville: 'Oujda', type: 'TA' },

    // ─── Tétouan ─────────────────────────────────────────────────────────────
    { code: 'TPI_TETOUAN', nom: 'TPI Tétouan', nomAr: 'المحكمة الابتدائية تطوان', ville: 'Tétouan', type: 'TPI' },
    { code: 'CA_TETOUAN', nom: 'Cour d\'Appel de Tétouan', nomAr: 'محكمة الاستئناف تطوان', ville: 'Tétouan', type: 'CA' },

    // ─── Laâyoune ────────────────────────────────────────────────────────────
    { code: 'TPI_LAAYOUNE', nom: 'TPI Laâyoune', nomAr: 'المحكمة الابتدائية العيون', ville: 'Laâyoune', type: 'TPI' },
    { code: 'CA_LAAYOUNE', nom: 'Cour d\'Appel de Laâyoune', nomAr: 'محكمة الاستئناف العيون', ville: 'Laâyoune', type: 'CA' },

    // ─── Settat ──────────────────────────────────────────────────────────────
    { code: 'TPI_SETTAT', nom: 'TPI Settat', nomAr: 'المحكمة الابتدائية سطات', ville: 'Settat', type: 'TPI' },
    { code: 'CA_SETTAT', nom: 'Cour d\'Appel de Settat', nomAr: 'محكمة الاستئناف سطات', ville: 'Settat', type: 'CA' },

    // ─── Beni Mellal ─────────────────────────────────────────────────────────
    { code: 'TPI_BENI_MELLAL', nom: 'TPI Beni Mellal', nomAr: 'المحكمة الابتدائية بني ملال', ville: 'Beni Mellal', type: 'TPI' },
    { code: 'CA_BENI_MELLAL', nom: 'Cour d\'Appel de Beni Mellal', nomAr: 'محكمة الاستئناف بني ملال', ville: 'Beni Mellal', type: 'CA' },

    // ─── Kénitra ─────────────────────────────────────────────────────────────
    { code: 'TPI_KENITRA', nom: 'TPI Kénitra', nomAr: 'المحكمة الابتدائية القنيطرة', ville: 'Kénitra', type: 'TPI' },
    { code: 'CA_KENITRA', nom: 'Cour d\'Appel de Kénitra', nomAr: 'محكمة الاستئناف القنيطرة', ville: 'Kénitra', type: 'CA' },

    // ─── Khémisset ───────────────────────────────────────────────────────────
    { code: 'TPI_KHEMISSET', nom: 'TPI Khémisset', nomAr: 'المحكمة الابتدائية الخميسات', ville: 'Khémisset', type: 'TPI' },

    // ─── Safi ────────────────────────────────────────────────────────────────
    { code: 'TPI_SAFI', nom: 'TPI Safi', nomAr: 'المحكمة الابتدائية آسفي', ville: 'Safi', type: 'TPI' },
    { code: 'CA_SAFI', nom: 'Cour d\'Appel de Safi', nomAr: 'محكمة الاستئناف آسفي', ville: 'Safi', type: 'CA' },

    // ─── El Jadida ───────────────────────────────────────────────────────────
    { code: 'TPI_EL_JADIDA', nom: 'TPI El Jadida', nomAr: 'المحكمة الابتدائية الجديدة', ville: 'El Jadida', type: 'TPI' },
    { code: 'CA_EL_JADIDA', nom: 'Cour d\'Appel d\'El Jadida', nomAr: 'محكمة الاستئناف الجديدة', ville: 'El Jadida', type: 'CA' },

    // ─── Nador ───────────────────────────────────────────────────────────────
    { code: 'TPI_NADOR', nom: 'TPI Nador', nomAr: 'المحكمة الابتدائية الناظور', ville: 'Nador', type: 'TPI' },
    { code: 'CA_NADOR', nom: 'Cour d\'Appel de Nador', nomAr: 'محكمة الاستئناف الناظور', ville: 'Nador', type: 'CA' },

    // ─── Al Hoceima ──────────────────────────────────────────────────────────
    { code: 'TPI_AL_HOCEIMA', nom: 'TPI Al Hoceima', nomAr: 'المحكمة الابتدائية الحسيمة', ville: 'Al Hoceima', type: 'TPI' },

    // ─── Chefchaouen ─────────────────────────────────────────────────────────
    { code: 'TPI_CHEFCHAOUEN', nom: 'TPI Chefchaouen', nomAr: 'المحكمة الابتدائية شفشاون', ville: 'Chefchaouen', type: 'TPI' },

    // ─── Larache ─────────────────────────────────────────────────────────────
    { code: 'TPI_LARACHE', nom: 'TPI Larache', nomAr: 'المحكمة الابتدائية العرائش', ville: 'Larache', type: 'TPI' },

    // ─── Ksar El Kébir ───────────────────────────────────────────────────────
    { code: 'TPI_KSAR_EL_KEBIR', nom: 'TPI Ksar El Kébir', nomAr: 'المحكمة الابتدائية القصر الكبير', ville: 'Ksar El Kébir', type: 'TPI' },

    // ─── Berrechid ───────────────────────────────────────────────────────────
    { code: 'TPI_BERRECHID', nom: 'TPI Berrechid', nomAr: 'المحكمة الابتدائية برشيد', ville: 'Berrechid', type: 'TPI' },

    // ─── Mohammedia ──────────────────────────────────────────────────────────
    { code: 'TPI_MOHAMMEDIA', nom: 'TPI Mohammedia', nomAr: 'المحكمة الابتدائية المحمدية', ville: 'Mohammedia', type: 'TPI' },

    // ─── Taza ────────────────────────────────────────────────────────────────
    { code: 'TPI_TAZA', nom: 'TPI Taza', nomAr: 'المحكمة الابتدائية تازة', ville: 'Taza', type: 'TPI' },
    { code: 'CA_TAZA', nom: 'Cour d\'Appel de Taza', nomAr: 'محكمة الاستئناف تازة', ville: 'Taza', type: 'CA' },

    // ─── Guelmim ─────────────────────────────────────────────────────────────
    { code: 'TPI_GUELMIM', nom: 'TPI Guelmim', nomAr: 'المحكمة الابتدائية كلميم', ville: 'Guelmim', type: 'TPI' },
    { code: 'CA_GUELMIM', nom: 'Cour d\'Appel de Guelmim', nomAr: 'محكمة الاستئناف كلميم', ville: 'Guelmim', type: 'CA' },

    // ─── Dakhla ──────────────────────────────────────────────────────────────
    { code: 'TPI_DAKHLA', nom: 'TPI Dakhla', nomAr: 'المحكمة الابتدائية الداخلة', ville: 'Dakhla', type: 'TPI' },

    // ─── Errachidia ──────────────────────────────────────────────────────────
    { code: 'TPI_ERRACHIDIA', nom: 'TPI Errachidia', nomAr: 'المحكمة الابتدائية الراشيدية', ville: 'Errachidia', type: 'TPI' },
    { code: 'CA_ERRACHIDIA', nom: 'Cour d\'Appel d\'Errachidia', nomAr: 'محكمة الاستئناف الراشيدية', ville: 'Errachidia', type: 'CA' },

    // ─── Ouarzazate ──────────────────────────────────────────────────────────
    { code: 'TPI_OUARZAZATE', nom: 'TPI Ouarzazate', nomAr: 'المحكمة الابتدائية ورزازات', ville: 'Ouarzazate', type: 'TPI' },
    { code: 'CA_OUARZAZATE', nom: 'Cour d\'Appel d\'Ouarzazate', nomAr: 'محكمة الاستئناف ورزازات', ville: 'Ouarzazate', type: 'CA' },

    // ─── Ifrane ──────────────────────────────────────────────────────────────
    { code: 'TPI_IFRANE', nom: 'TPI Ifrane', nomAr: 'المحكمة الابتدائية إفران', ville: 'Ifrane', type: 'TPI' },

    // ─── Azilal ──────────────────────────────────────────────────────────────
    { code: 'TPI_AZILAL', nom: 'TPI Azilal', nomAr: 'المحكمة الابتدائية أزيلال', ville: 'Azilal', type: 'TPI' },

    // ─── Khouribga ───────────────────────────────────────────────────────────
    { code: 'TPI_KHOURIBGA', nom: 'TPI Khouribga', nomAr: 'المحكمة الابتدائية خريبكة', ville: 'Khouribga', type: 'TPI' },

    // ─── Tiznit ──────────────────────────────────────────────────────────────
    { code: 'TPI_TIZNIT', nom: 'TPI Tiznit', nomAr: 'المحكمة الابتدائية تيزنيت', ville: 'Tiznit', type: 'TPI' },

    // ─── Tan Tan ─────────────────────────────────────────────────────────────
    { code: 'TPI_TAN_TAN', nom: 'TPI Tan Tan', nomAr: 'المحكمة الابتدائية طانطان', ville: 'Tan Tan', type: 'TPI' },

    // ─── Essaouira ───────────────────────────────────────────────────────────
    { code: 'TPI_ESSAOUIRA', nom: 'TPI Essaouira', nomAr: 'المحكمة الابتدائية الصويرة', ville: 'Essaouira', type: 'TPI' },

    // ─── Taourirt ────────────────────────────────────────────────────────────
    { code: 'TPI_TAOURIRT', nom: 'TPI Taourirt', nomAr: 'المحكمة الابتدائية تاوريرت', ville: 'Taourirt', type: 'TPI' },

    // ─── Tribunaux Administratifs d'Appel ────────────────────────────────────
    { code: 'TAA_RABAT', nom: 'Tribunal Administratif d\'Appel de Rabat', nomAr: 'محكمة الاستئناف الإدارية الرباط', ville: 'Rabat', type: 'TAA' },
    { code: 'TAA_CASA', nom: 'Tribunal Administratif d\'Appel de Casablanca', nomAr: 'محكمة الاستئناف الإدارية الدار البيضاء', ville: 'Casablanca', type: 'TAA' },
    { code: 'TAA_MARRAKECH', nom: 'Tribunal Administratif d\'Appel de Marrakech', nomAr: 'محكمة الاستئناف الإدارية مراكش', ville: 'Marrakech', type: 'TAA' },
    { code: 'TAA_FES', nom: 'Tribunal Administratif d\'Appel de Fès', nomAr: 'محكمة الاستئناف الإدارية فاس', ville: 'Fès', type: 'TAA' },
  ]

  console.log(`Insertion de ${tribunaux.length} tribunaux...`)

  for (const t of tribunaux) {
    await prisma.tribunal.upsert({
      where: { code: t.code },
      update: t,
      create: t,
    })
  }

  console.log(`✓ ${tribunaux.length} tribunaux insérés/mis à jour`)
  console.log('Seed terminé ✓')
}

main()
  .catch((e) => {
    console.error('Erreur seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
