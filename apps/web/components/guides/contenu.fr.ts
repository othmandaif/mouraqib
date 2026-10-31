// Guides pratiques en français (6). Voir les règles de rédaction en tête de ./contenu.ts.
// VALIDATION : les points à faire valider par un avocat sont listés dans claude/GUIDES_SEO_VALIDATION.md.
import type { Guide, Source } from './contenu'
import type { GuideId } from '@/lib/guidesPublics'

const SRC: Record<string, Source> = {
  mahakim: { nom: 'Portail mahakim', url: 'https://www.mahakim.ma', usage: 'Service officiel de suivi des dossiers : champs et intitulés à jour.' },
  justice: { nom: 'Ministère de la Justice', url: 'https://www.justice.gov.ma', usage: 'Informations officielles sur les services en ligne des juridictions.' },
  sgg: { nom: 'Secrétariat général du gouvernement (Bulletin officiel)', url: 'https://www.sgg.gov.ma', usage: 'Texte officiel des lois, dont la loi n° 58.25 (Bulletin officiel n° 7485 du 23 février 2026).' },
  cndp: { nom: 'CNDP (protection des données personnelles)', url: 'https://www.cndp.ma', usage: 'Autorité créée par la loi 09-08 : déclaration, autorisation préalable, transfert à l’étranger.' },
  dgi: { nom: 'Direction générale des impôts', url: 'https://www.tax.gov.ma', usage: 'Code général des impôts et obligations de facturation.' },
  cassation: { nom: 'Greffe de la Cour de cassation', url: 'https://greffe.courdecassation.ma', usage: 'Recherche d’un dossier devant la Cour de cassation.' },
}

export const GUIDES_FR: Record<GuideId, Guide> = {
  // ─────────────────────────── 1. Suivre un dossier sur mahakim ───────────────────────────
  'suivi-mahakim': {
    nav: 'Suivre un dossier sur mahakim',
    resume: 'Les informations à réunir, les étapes de recherche et les erreurs qui font croire qu’un dossier n’existe pas.',
    titre: 'Suivre un dossier judiciaire sur mahakim : guide pratique',
    description: 'Comment suivre un dossier sur le portail mahakim : informations à réunir, étapes de recherche, erreurs courantes et organisation pour plusieurs dossiers.',
    h1: 'Comment suivre un dossier judiciaire sur le portail mahakim',
    pastille: 'Guide pratique',
    lead: 'Le portail officiel mahakim, gratuit, permet de consulter l’avancement d’un dossier et ses dates d’audience. Ce guide explique ce qu’il faut réunir avant de chercher, comment éviter les erreurs de saisie et comment organiser le suivi quand on gère plusieurs dizaines de dossiers. MalafiPro, qui publie ce guide, est un logiciel indépendant : il n’est pas le portail officiel.',
    sections: [
      {
        h2: 'Ce que permet le portail mahakim',
        paras: [
          'Mahakim.ma est le portail des services en ligne des juridictions, rattaché au ministère de la Justice. Le ministère décrit son service de suivi comme permettant de consulter un dossier, ses dates d’audience et le magistrat désigné, à partir du numéro du dossier.',
          'Pour un avocat, l’intérêt est simple : savoir où en est un dossier sans se déplacer au greffe. La limite l’est tout autant : le portail affiche l’état connu au moment de la consultation, et un acte très récent peut ne pas y figurer encore.',
        ],
      },
      {
        h2: 'Réunir les bonnes informations avant de chercher',
        items: [
          { h3: 'La juridiction exacte', texte: 'Tribunal de première instance, tribunal de commerce, tribunal administratif, cour d’appel, Cour de cassation : le portail demande de choisir la juridiction. Une erreur à ce stade donne un dossier « introuvable » alors qu’il existe.' },
          { h3: 'Le type d’affaire', texte: 'Civil, commercial, famille, pénal, administratif : retenez le type qui correspond à l’intitulé porté sur votre convocation ou votre récépissé.' },
          { h3: 'Le numéro complet du dossier', texte: 'Le numéro se compose généralement d’un numéro d’ordre, d’un code et d’une année. Recopiez-le tel qu’il figure sur la pièce de procédure, sans le reconstituer de mémoire.' },
          { h3: 'Le bon numéro en appel', texte: 'Quand un dossier passe en appel, il porte un numéro propre à la juridiction d’appel. Gardez les deux numéros dans votre fiche.' },
        ],
      },
      {
        h2: 'Les étapes de la recherche',
        etapes: [
          'Ouvrez le service de suivi des dossiers sur le portail.',
          'Choisissez la juridiction.',
          'Choisissez le type d’affaire, si le portail le demande.',
          'Saisissez le numéro du dossier (ordre, code, année) dans les champs prévus.',
          'Lancez la recherche et lisez la fiche affichée : dernier acte, prochaine audience, parties.',
          'Notez le résultat et la date de consultation dans votre propre registre.',
        ],
        note: 'Les champs, leur ordre et leurs intitulés sont ceux du portail à la date de rédaction (octobre 2026) et peuvent changer : suivez toujours ce que le portail affiche.',
      },
      {
        h2: 'Ce qu’il faut relever dans le résultat',
        puces: [
          'La date et l’heure de la prochaine audience, et la formation concernée.',
          'Le dernier acte enregistré : renvoi, mise en délibéré, jugement, notification.',
          'La date de cet acte, car c’est elle qui sert de repère pour la suite.',
          'Le statut dans votre registre : « à agir », « à surveiller » ou « clos ».',
        ],
        paras: ['Ne présumez pas qu’une information affichée sur le portail produit les effets d’une notification : vérifiez les pièces du dossier et les textes applicables avant de retenir une date.'],
      },
      {
        h2: 'Les autres services officiels utiles',
        items: [
          { h3: 'Le rôle des audiences', texte: 'Le ministère de la Justice propose aussi un service de consultation du rôle des audiences (جدول الجلسات), utile pour vérifier ce qui est programmé un jour donné.' },
          { h3: 'La Cour de cassation', texte: 'Un dossier devant la Cour de cassation se recherche sur le portail du greffe de cette Cour, en choisissant la juridiction d’origine et en saisissant le numéro d’appel et le type de dossier.' },
        ],
      },
      {
        h2: 'Les erreurs qui font croire qu’un dossier n’existe pas',
        puces: [
          'Mauvaise juridiction : par exemple le tribunal de première instance au lieu du tribunal de commerce.',
          'Numéro de première instance saisi pour un dossier devenu dossier d’appel.',
          'Année ou code inversé, ou mal recopié.',
          'Dossier trop récent pour être déjà enregistré.',
          'Type d’affaire mal choisi.',
        ],
      },
      {
        h2: 'Suivre plusieurs dizaines de dossiers sans y passer ses journées',
        paras: [
          'Tenez un registre unique, même simple : numéro, juridiction, client, dernier acte connu, prochaine audience, date de la dernière consultation.',
          'Adaptez la fréquence à l’enjeu : plus souvent pour un dossier en délibéré, avec une audience proche ou un jugement récent ; moins souvent pour un dossier dormant. Il n’existe pas de règle générale : c’est une question d’organisation.',
          'Désignez une personne responsable de la consultation et une autre qui contrôle les dossiers à enjeu. Quand le registre dépasse ce qu’une personne peut relire chaque jour, un outil qui consulte le portail à votre place devient utile.',
        ],
      },
    ],
    fonctions: [{ id: 'suivi', texte: 'Voir comment MalafiPro relit vos dossiers sur mahakim et vous signale chaque nouvel acte.' }],
    faq: [
      { q: 'Pourquoi mon dossier est-il introuvable sur le portail ?', r: 'Les causes les plus fréquentes sont une mauvaise juridiction, un numéro d’appel confondu avec le numéro de première instance, une année ou un code mal saisi, ou un dossier trop récent. Recontrôlez la pièce de procédure qui porte le numéro.' },
      { q: 'À quelle fréquence consulter un dossier ?', r: 'Il n’y a pas de règle générale. Consultez plus souvent les dossiers à enjeu (audience proche, délibéré, jugement récent) et moins souvent les dossiers dormants.' },
      { q: 'L’information du portail suffit-elle pour fixer un délai ?', r: 'Non : traitez-la comme un indicateur. Vérifiez les pièces du dossier et les textes applicables avant de retenir une date.' },
      { q: 'Peut-on suivre tous les types de juridictions ?', r: 'Le portail propose un choix de juridiction ; la couverture dépend des services ouverts par le ministère et peut évoluer. Consultez le portail pour la liste à jour.' },
      { q: 'MalafiPro remplace-t-il le portail ?', r: 'Non. MalafiPro lit les informations publiques affichées sur le portail et vous alerte ; le portail reste la source. Pour un acte urgent, vérifiez aussi directement.' },
    ],
    sources: [SRC.mahakim, SRC.justice, SRC.cassation],
    lies: ['audiences-echeances', 'alertes-whatsapp', 'clients-dossiers'],
  },

  // ─────────────────────────── 2. Organiser audiences et échéances ───────────────────────────
  'audiences-echeances': {
    nav: 'Organiser audiences et échéances',
    resume: 'Deux listes, une routine hebdomadaire, des marges de sécurité et une double vérification.',
    titre: 'Organiser audiences et échéances d’un cabinet d’avocat',
    description: 'Méthode pratique pour organiser audiences et échéances en cabinet : deux listes, revue hebdomadaire, marges de sécurité et double vérification.',
    h1: 'Comment organiser les audiences et les échéances d’un cabinet d’avocat',
    pastille: 'Guide pratique',
    lead: 'Un cabinet manque rarement une échéance par ignorance de la règle. Il la manque parce que l’information est au mauvais endroit, chez la mauvaise personne, au mauvais moment. Ce guide propose une méthode simple, applicable avec un agenda partagé, un tableur ou un logiciel.',
    sections: [
      {
        h2: 'Deux listes plutôt qu’une',
        paras: ['La première règle est de ne pas mélanger ce qui engage votre client et ce que vous observez chez l’adversaire.'],
        items: [
          { h3: 'À agir', texte: 'Les échéances qui courent contre votre client : acte à déposer, recours à former, pièces à produire. Elles sont prioritaires et doivent déclencher des rappels.' },
          { h3: 'À surveiller', texte: 'Les échéances de la partie adverse. Elles n’appellent pas d’action immédiate, mais leur expiration change la situation du dossier : gardez-les visibles sans les confondre avec les vôtres.' },
        ],
      },
      {
        h2: 'Noter la bonne date de départ',
        paras: [
          'Une échéance se calcule à partir d’un événement : une décision, une publication, une notification. Pour chaque acte, consignez au minimum sa nature, la date de la décision, la date à laquelle vous en avez eu connaissance, la date de notification quand elle est établie, et la pièce qui le prouve.',
          'Ne recopiez jamais une durée de mémoire : relisez le texte applicable et notez sa référence à côté de l’échéance.',
        ],
      },
      {
        h2: 'Un cadre légal qui vient de changer',
        paras: [
          'Le nouveau Code de procédure civile (loi n° 58.25), publié au Bulletin officiel n° 7485 du 23 février 2026, est applicable depuis le 24 août 2026.',
          'En pratique, ajoutez à chaque dossier la date de la décision concernée et vérifiez, dans le texte officiel, les dispositions transitoires qui déterminent les règles applicables.',
        ],
        note: 'Le régime applicable à chaque dossier est à confirmer par un avocat, à partir du texte officiel publié au Bulletin officiel.',
      },
      {
        h2: 'Une routine hebdomadaire',
        etapes: [
          'Lundi : relire toutes les échéances « à agir » de la semaine et des deux semaines suivantes, et attribuer chacune à une personne.',
          'Chaque jour : consulter les nouveautés des dossiers (portail, greffe, courrier) et mettre le registre à jour avant de quitter le cabinet.',
          'Jeudi ou vendredi : préparer les pièces des audiences de la semaine suivante et confirmer les procurations.',
          'Chaque mois : passer en revue les dossiers dormants pour vérifier qu’aucune échéance n’a été oubliée.',
        ],
      },
      {
        h2: 'Marges de sécurité et double vérification',
        puces: [
          'Fixez des rappels échelonnés avant chaque échéance plutôt qu’un seul la veille. À titre d’exemple, MalafiPro propose par défaut des rappels à 7, 3 et 1 jours, puis le jour même ; adaptez-les à la nature de l’échéance.',
          'Faites valider par une seconde personne les échéances dont l’oubli aurait des conséquences irréversibles pour le client.',
          'Consignez la date et l’auteur de chaque calcul : en cas de doute, vous retrouvez comment la date a été établie.',
          'Retenez qu’une alerte n’est pas l’échéance : c’est un signal pour vérifier.',
        ],
      },
      {
        h2: 'Préparer et suivre les audiences',
        puces: [
          'Pièces à jour et bordereau prêt.',
          'Procuration et convention d’honoraires dans le dossier.',
          'Client informé de la date et de l’objet de l’audience.',
          'Après l’audience : noter l’issue (renvoi, mise en délibéré, jugement) et la nouvelle date le jour même.',
        ],
      },
      {
        h2: 'Quel outil choisir',
        paras: ['Un agenda partagé suffit pour un petit portefeuille. Un tableur devient fragile quand plusieurs personnes l’éditent. Un logiciel dédié apporte surtout les rappels automatiques et l’historique. Peu importe l’outil : ce qui compte, c’est qu’une seule source fasse foi.'],
      },
    ],
    fonctions: [
      { id: 'alertes', texte: 'Voir comment MalafiPro affiche les délais « à vous » et « à l’adversaire » et envoie les rappels.' },
      { id: 'suivi', texte: 'Voir comment MalafiPro relit vos dossiers sur mahakim pour alimenter votre agenda.' },
    ],
    faq: [
      { q: 'Faut-il garder un agenda papier en plus du logiciel ?', r: 'Ce qui compte est l’existence d’une source unique qui fait foi. Une copie de secours, par exemple une impression hebdomadaire, reste une bonne pratique.' },
      { q: 'Quels rappels programmer avant une échéance ?', r: 'Il n’y a pas de règle universelle. Un schéma courant consiste à programmer plusieurs rappels échelonnés puis un rappel le jour même, et à en ajouter si l’échéance est complexe.' },
      { q: 'Comment traiter les échéances de la partie adverse ?', r: 'Placez-les dans la liste « à surveiller » : visibles, mais sans le niveau d’alerte des échéances qui vous engagent.' },
      { q: 'Que faire quand la date d’une notification est incertaine ?', r: 'Documentez ce que vous savez (date de publication, date de réception, pièce), travaillez avec la date la plus prudente pour agir, et faites confirmer la qualification par un avocat à partir des textes applicables.' },
      { q: 'Un secrétariat peut-il gérer les échéances ?', r: 'Il peut saisir et mettre à jour le registre. La validation des échéances critiques reste à l’avocat, et les droits de suppression doivent être limités.' },
    ],
    sources: [SRC.sgg, SRC.mahakim, SRC.justice],
    lies: ['suivi-mahakim', 'alertes-whatsapp', 'clients-dossiers'],
  },

  // ─────────────────────────── 3. Gérer clients et dossiers ───────────────────────────
  'clients-dossiers': {
    nav: 'Gérer clients et dossiers',
    resume: 'Fiche client, chronologie du dossier, historique, contrôle des noms et gestion des accès.',
    titre: 'Gérer clients et dossiers d’un cabinet d’avocat : méthode',
    description: 'Organiser les fiches clients, les dossiers, l’historique des échanges, le contrôle des conflits d’intérêts et les accès d’un cabinet d’avocat au Maroc.',
    h1: 'Comment gérer les clients et les dossiers d’un cabinet d’avocat',
    pastille: 'Guide pratique',
    lead: 'Un cabinet performant est d’abord un cabinet où l’on retrouve en dix secondes l’état d’un dossier et l’historique d’un client. Ce guide décrit une organisation simple pour les clients, les dossiers et les accès.',
    sections: [
      {
        h2: 'Une fiche par client, complète dès le premier rendez-vous',
        items: [
          { h3: 'Identité', texte: 'Nom ou raison sociale ; CIN pour une personne ; ICE et registre de commerce pour une société, avec le nom de son représentant.' },
          { h3: 'Coordonnées', texte: 'Téléphone, e-mail, adresse, et le canal que le client préfère pour être joint.' },
          { h3: 'Pièces de base', texte: 'Procuration, copie de la pièce d’identité, convention d’honoraires signée.' },
          { h3: 'Notes', texte: 'Le contexte de l’affaire et les particularités utiles à un collègue qui reprendrait le dossier.' },
        ],
      },
      {
        h2: 'Un dossier, une chronologie',
        paras: ['Chaque dossier doit raconter son histoire dans l’ordre : actes, audiences, notifications, pièces échangées, décisions. Rattachez-le au client dès sa création et indiquez le rôle de votre client, demandeur ou défendeur : tout le suivi des échéances en dépend.'],
      },
      {
        h2: 'Garder l’historique des échanges',
        paras: ['Notez chaque échange important, appel, rendez-vous ou message, avec sa date et ce qui a été convenu. Cet historique protège le cabinet en cas de désaccord et permet à un collègue de reprendre le dossier sans repartir de zéro.'],
      },
      {
        h2: 'Contrôler un possible conflit d’intérêts avant d’accepter',
        paras: [
          'Avant d’accepter une affaire, vérifiez si la partie adverse ou le futur client apparaît déjà dans vos dossiers, à un autre titre. Une recherche par nom parmi vos clients et vos adversaires est un bon premier filtre.',
          'Ce contrôle ne dit pas s’il y a un conflit : il signale des noms proches. L’appréciation relève de l’avocat et des règles de son barreau.',
        ],
        note: 'Les règles de déontologie applicables sont à vérifier auprès de votre barreau.',
      },
      {
        h2: 'Qui accède à quoi',
        puces: [
          'Donnez à chaque membre l’accès dont il a besoin, pas davantage.',
          'Réservez à un responsable les actions irréversibles : supprimer un dossier, l’archiver, annuler une facture.',
          'Retirez les accès d’une personne qui quitte le cabinet le jour de son départ.',
          'Activez la double authentification partout où l’outil la propose.',
        ],
      },
      {
        h2: 'Clôturer et archiver sans rien perdre',
        paras: [
          'Quand un dossier se termine, notez l’issue, vérifiez les honoraires encaissés, puis archivez plutôt que de supprimer.',
          'Les durées de conservation des dossiers relèvent des règles de la profession : renseignez-vous auprès de votre barreau avant de détruire quoi que ce soit.',
        ],
      },
    ],
    fonctions: [{ id: 'clients', texte: 'Voir comment MalafiPro rassemble fiche client, dossiers, historique et contrôle des noms proches.' }],
    faq: [
      { q: 'Quelles informations conserver sur un client ?', r: 'Celles utiles à la défense de ses intérêts et à la facturation : identité, coordonnées, procuration, convention d’honoraires, historique. Limitez-vous à ce qui est nécessaire et protégez l’accès.' },
      { q: 'Les données de mes clients relèvent-elles de la protection des données personnelles ?', r: 'Ce sont des données personnelles. La CNDP, autorité créée par la loi 09-08, précise les démarches (déclaration, autorisation préalable, transfert à l’étranger). Vérifiez ce qui s’applique à votre cabinet.' },
      { q: 'Comment éviter les doublons de clients ?', r: 'Cherchez par nom avant de créer une fiche, uniformisez l’écriture des noms en arabe et en lettres latines, et reliez tous les dossiers d’un même client à une seule fiche.' },
      { q: 'Qui doit pouvoir supprimer un dossier ?', r: 'Un responsable. Archiver doit rester l’option par défaut pour les autres membres du cabinet.' },
      { q: 'Peut-on exporter ses données ?', r: 'Avant de choisir un outil, vérifiez que vous pouvez exporter vos données. MalafiPro permet de demander l’export depuis le compte.' },
    ],
    sources: [SRC.cndp],
    lies: ['facturation-honoraires', 'audiences-echeances', 'suivi-mahakim'],
  },

  // ─────────────────────────── 4. Alertes WhatsApp ───────────────────────────
  'alertes-whatsapp': {
    nav: 'Alertes WhatsApp : avantages',
    resume: 'Pourquoi WhatsApp convient aux alertes, ce qu’elles doivent contenir et la charte à adopter.',
    titre: 'Alertes WhatsApp pour avocats : avantages et limites',
    description: 'Avantages et limites des alertes WhatsApp pour un cabinet d’avocat : contenu d’une bonne alerte, heures calmes, confidentialité et charte d’usage.',
    h1: 'Les alertes WhatsApp pour avocats : avantages, limites et règles d’usage',
    pastille: 'Guide pratique',
    lead: 'WhatsApp est déjà ouvert sur le téléphone de chaque avocat : c’est pour cela qu’il fonctionne bien pour les alertes. Mais ce qui passe par une messagerie grand public mérite des règles. Ce guide présente les avantages, les limites et une charte simple.',
    sections: [
      {
        h2: 'Pourquoi WhatsApp convient aux alertes',
        puces: [
          'Le message est lu en quelques minutes, là où un e-mail dort parfois des heures.',
          'Aucune application de plus à ouvrir.',
          'Il fonctionne partout, y compris hors du cabinet et au tribunal.',
          'Son format court se prête à l’essentiel : quoi, où, quand.',
        ],
      },
      {
        h2: 'Ce qu’une bonne alerte contient — et ne contient pas',
        paras: ['Une alerte utile tient en une ligne : le numéro du dossier, la juridiction, la nature de l’événement et la date. Le détail se consulte ensuite dans l’outil de travail.'],
        puces: [
          'À mettre : numéro du dossier, juridiction, nature de l’événement, date.',
          'À éviter : noms des parties, faits, montants, pièces jointes.',
        ],
      },
      {
        h2: 'Hiérarchiser pour éviter la fatigue d’alerte',
        paras: ['Si tout alerte, plus rien n’alerte. Distinguez trois niveaux et réservez la sonnerie au premier.'],
        items: [
          { h3: 'Ce qui exige une action', texte: 'Une échéance proche qui court contre votre client.' },
          { h3: 'Ce qui est à lire', texte: 'Un nouvel acte ou un renvoi à intégrer au dossier.' },
          { h3: 'Le point quotidien', texte: 'Un résumé du matin, à lire sans urgence.' },
        ],
      },
      {
        h2: 'Heures calmes et vie privée',
        paras: ['Une alerte à 23 h pour une échéance dans trois semaines fait plus de mal que de bien. Définissez une plage calme et ne passez outre que pour ce qui est imminent.'],
      },
      {
        h2: 'Ne jamais dépendre d’un seul canal',
        paras: [
          'Un message peut être retardé, supprimé ou manqué. Gardez une copie de chaque alerte dans votre outil de travail et ne remplacez jamais le suivi des échéances par une conversation.',
          'Une alerte WhatsApp n’est pas une notification judiciaire : elle ne produit aucun effet juridique, elle sert seulement à vous prévenir.',
        ],
      },
      {
        h2: 'Une charte de cabinet en cinq points',
        etapes: [
          'Aucune information de fond sur un client dans un groupe WhatsApp.',
          'Téléphone verrouillé et sauvegardes protégées.',
          'Numéro vérifié avant d’activer les alertes.',
          'Départ d’un collaborateur : retirer son numéro des alertes le jour même.',
          'Revue de la charte une fois par an.',
        ],
      },
      {
        h2: 'Données personnelles et secret professionnel',
        paras: ['Les informations de vos clients sont couvertes par le secret professionnel et constituent des données personnelles. Limitez ce qui transite par une messagerie grand public, et renseignez-vous auprès de la CNDP sur les démarches applicables : déclaration, autorisation préalable, transfert à l’étranger.'],
        note: 'L’application du secret professionnel aux messageries grand public est à confirmer auprès de votre barreau.',
      },
    ],
    fonctions: [{ id: 'alertes', texte: 'Voir comment MalafiPro envoie les alertes WhatsApp : contenu discret, heures calmes, copie dans l’application.' }],
    faq: [
      { q: 'Les alertes WhatsApp sont-elles sûres ?', r: 'Aucune messagerie grand public n’offre de garantie de confidentialité. La bonne pratique consiste à limiter le contenu à l’essentiel (numéro, juridiction, nature) et à ne jamais y mettre le nom des parties.' },
      { q: 'Peut-on recevoir des alertes sans WhatsApp ?', r: 'Cela dépend de l’outil. MalafiPro conserve aussi chaque alerte dans l’application.' },
      { q: 'Combien d’alertes par jour est-ce raisonnable ?', r: 'Il n’y a pas de nombre idéal. Si vous finissez par ignorer les alertes, c’est qu’il y en a trop : regroupez-les dans un point quotidien.' },
      { q: 'Une alerte WhatsApp vaut-elle notification ?', r: 'Non. Elle vous prévient, mais ne produit aucun effet juridique. Seuls les actes de procédure prévus par les textes ont cet effet.' },
      { q: 'Que faire quand un numéro change ?', r: 'Mettez-le à jour et vérifiez-le avant tout envoi. MalafiPro n’envoie ses alertes WhatsApp qu’à un numéro vérifié.' },
    ],
    sources: [SRC.cndp],
    lies: ['audiences-echeances', 'suivi-mahakim', 'intelligence-artificielle'],
  },

  // ─────────────────────────── 5. Facturation et honoraires ───────────────────────────
  'facturation-honoraires': {
    nav: 'Facturation et honoraires',
    resume: 'Convention écrite, provisions, facture numérotée, suivi des règlements et relances.',
    titre: 'Facturation et suivi des honoraires d’avocat : méthode',
    description: 'Organiser la facturation d’un cabinet d’avocat : convention d’honoraires, provisions, facture numérotée, suivi des règlements et relances.',
    h1: 'Comment organiser la facturation et le suivi des honoraires d’un cabinet',
    pastille: 'Guide pratique',
    lead: 'Les honoraires impayés viennent rarement d’un client de mauvaise foi : ils viennent d’un suivi irrégulier. Ce guide propose une méthode pour convenir, facturer et encaisser sans y passer ses soirées.',
    sections: [
      {
        h2: 'Convenir des honoraires par écrit',
        paras: ['Une convention d’honoraires écrite, signée au début de la mission, évite la plupart des désaccords : objet de la mission, mode de calcul, provisions, frais et modalités de paiement.'],
        note: 'Les règles applicables à la fixation des honoraires relèvent de la profession : vérifiez-les auprès de votre barreau.',
      },
      {
        h2: 'Distinguer provision, honoraires et frais',
        items: [
          { h3: 'La provision', texte: 'Une somme versée avant ou pendant la mission, qui sera ensuite imputée sur les honoraires.' },
          { h3: 'Les honoraires', texte: 'La rémunération de la mission, selon ce qui a été convenu.' },
          { h3: 'Les frais', texte: 'Les sommes avancées pour le client : droits, expertise, déplacements. Séparez-les dans vos documents.' },
        ],
      },
      {
        h2: 'Une facture par étape, avec des règles de base',
        paras: ['En matière fiscale, le Code général des impôts (article 145) prévoit que les factures soient pré-numérotées dans une série continue et comportent certaines mentions, dont l’ICE (article 145-VIII). Les modalités exactes dépendent de votre situation fiscale.'],
        puces: [
          'Numérotation chronologique, sans trou.',
          'Coordonnées complètes du client, avec l’ICE pour une société.',
          'Une facture émise ne se modifie pas : on l’annule par un avoir, puis on en émet une nouvelle si nécessaire.',
          'Date d’émission et échéance de paiement clairement indiquées.',
        ],
        note: 'À valider avec votre comptable et à vérifier sur le site de la Direction générale des impôts.',
      },
      {
        h2: 'Suivre les règlements',
        etapes: [
          'Enregistrer chaque paiement le jour où il est reçu.',
          'Le rattacher au client et à la facture concernée.',
          'Conserver comme « provision non imputée » tout paiement qui n’a pas encore de facture.',
          'Faire chaque mois le point des factures non soldées.',
          'Relancer à des dates fixées d’avance.',
        ],
      },
      {
        h2: 'Relancer sans abîmer la relation',
        puces: [
          'Fixez en interne le calendrier des relances, pour ne pas dépendre de l’humeur du moment.',
          'Commencez par un rappel courtois, accompagné de la facture.',
          'Proposez un échéancier quand le client est de bonne foi mais en difficulté.',
          'Gardez une trace écrite de chaque relance.',
        ],
      },
      {
        h2: 'Le rôle du comptable',
        paras: ['Votre outil de facturation suit vos factures et vos encaissements ; il ne remplace pas la comptabilité ni les conseils fiscaux. Faites relire vos premiers modèles de facture par votre comptable, puis conservez-les.'],
      },
    ],
    fonctions: [
      { id: 'facturation', texte: 'Voir comment MalafiPro numérote les factures, gère les avoirs et suit les règlements.' },
      { id: 'actes', texte: 'Voir comment préparer la convention d’honoraires et le reçu de provision depuis le dossier.' },
    ],
    faq: [
      { q: 'Peut-on corriger une facture déjà envoyée ?', r: 'Une facture émise ne se modifie pas : on l’annule par un avoir, puis on en émet une nouvelle. Confirmez cette pratique avec votre comptable.' },
      { q: 'Qu’est-ce qu’une provision non imputée ?', r: 'C’est un paiement reçu qui n’est pas encore rattaché à une facture. Il reste visible dans le suivi jusqu’à son imputation.' },
      { q: 'L’ICE doit-il figurer sur la facture ?', r: 'Le Code général des impôts (article 145-VIII) en fait une obligation pour les factures des contribuables. Vérifiez avec votre comptable ce qui s’applique à votre situation.' },
      { q: 'À quelle fréquence relancer un client ?', r: 'Il n’existe pas de règle générale. Fixez un calendrier simple et tenez-vous-y, plutôt que de relancer au hasard.' },
      { q: 'Quelle vue d’ensemble faut-il suivre ?', r: 'Ce qui a été facturé, ce qui a été encaissé et ce qui reste à encaisser, mois par mois. La synthèse de MalafiPro présente exactement ces trois éléments.' },
    ],
    sources: [SRC.dgi],
    lies: ['clients-dossiers', 'audiences-echeances', 'intelligence-artificielle'],
  },

  // ─────────────────────────── 6. Intelligence artificielle ───────────────────────────
  'intelligence-artificielle': {
    nav: 'IA dans un cabinet',
    resume: 'Où l’IA aide, où l’avocat décide, comment vérifier et comment protéger les données.',
    titre: 'Utiliser l’IA dans un cabinet d’avocat : bonnes pratiques',
    description: 'Où l’intelligence artificielle aide un cabinet d’avocat, où l’avocat doit décider, comment vérifier les réponses et protéger les données de ses clients.',
    h1: 'Comment utiliser l’intelligence artificielle dans un cabinet d’avocat',
    pastille: 'Guide pratique',
    lead: 'L’IA peut faire gagner du temps à un cabinet : résumer, classer, proposer un premier jet. Elle peut aussi produire une erreur d’apparence parfaitement sûre. Ce guide explique où l’utiliser, où ne pas la laisser décider, et comment vérifier.',
    sections: [
      {
        h2: 'Là où l’IA aide vraiment',
        items: [
          { h3: 'Résumer', texte: 'Un dossier ou un acte long, à relire avant une audience.' },
          { h3: 'Classer', texte: 'Repérer le type d’un acte (jugement, renvoi, notification) pour trier un portefeuille.' },
          { h3: 'Proposer un premier jet', texte: 'Un acte préparé à partir des données du dossier, que vous corrigez ensuite.' },
          { h3: 'Retrouver des textes', texte: 'Une recherche qui cite ses sources, pour que vous les ouvriez.' },
        ],
      },
      {
        h2: 'Là où l’avocat décide',
        puces: [
          'La qualification juridique et la stratégie.',
          'Le calcul et la validation des délais.',
          'La signature, le dépôt et l’engagement de responsabilité.',
          'Tout acte irréversible pour le client.',
        ],
      },
      {
        h2: 'Vérifier : une méthode en quatre gestes',
        etapes: [
          'Exiger les sources : une réponse sans source ne vaut rien.',
          'Ouvrir chaque article cité et le relire dans le texte officiel.',
          'Vérifier la version en vigueur : un texte récent, comme le nouveau Code de procédure civile applicable depuis le 24 août 2026, peut ne pas figurer encore dans les sources d’un outil.',
          'Relire les chiffres, les dates et les noms.',
        ],
      },
      {
        h2: 'Confidentialité : que mettre dans un outil d’IA',
        paras: [
          'Avant d’utiliser un outil, répondez à trois questions : quelles données quittent le cabinet, vers quels prestataires, et sous quelles conditions ? Beaucoup d’outils d’IA s’appuient sur des fournisseurs externes.',
          'En cas de doute, anonymisez : retirez noms, adresses et numéros avant de saisir un texte. Renseignez-vous auprès de la CNDP sur les démarches applicables aux données personnelles.',
        ],
        puces: [
          'Ne collez pas de pièces de clients dans un outil grand public gratuit.',
          'Lisez la politique de confidentialité et demandez au fournisseur où sont traitées les données.',
          'Donnez des consignes écrites à toute l’équipe.',
        ],
        note: 'Le secret professionnel et la protection des données appliqués à l’IA sont à confirmer auprès de votre barreau.',
      },
      {
        h2: 'Une politique d’usage de l’IA, en une page',
        etapes: [
          'Qui peut utiliser quels outils.',
          'Quelles données sont interdites.',
          'La vérification est obligatoire avant tout usage externe.',
          'Garder la version générée et la version finale de chaque acte.',
          'Former les nouveaux arrivants.',
          'Revoir la politique deux fois par an.',
        ],
      },
      {
        h2: 'Évaluer un outil d’IA pour avocats',
        puces: [
          'Les sources sont-elles affichées et ouvrables ?',
          'La mémoire de l’outil est-elle visible et modifiable ?',
          'Peut-on exporter ses données ?',
          'L’outil travaille-t-il correctement en arabe juridique ?',
          'Y a-t-il une relecture ou un garde-fou contre les erreurs graves ?',
          'Les accès sont-ils contrôlés par rôle ?',
        ],
      },
    ],
    fonctions: [
      { id: 'assistant', texte: 'Voir comment l’assistant de MalafiPro cite ses sources et garde une mémoire que vous contrôlez.' },
      { id: 'actes', texte: 'Voir comment MalafiPro prépare un premier jet d’acte à partir du dossier.' },
    ],
    faq: [
      { q: 'L’IA peut-elle remplacer un juriste ?', r: 'Non. Elle accélère certaines tâches, mais l’analyse, la stratégie et la responsabilité restent à l’avocat.' },
      { q: 'Peut-on lui faire confiance pour les délais ?', r: 'Non. Le calcul d’un délai doit être vérifié sur les textes applicables. Un outil peut aider à les suivre ; il ne les valide pas.' },
      { q: 'Quelles données ne jamais saisir dans un outil d’IA ?', r: 'Noms de clients, numéros de dossiers, pièces et montants, tant que vous ignorez où ils sont traités. Anonymisez systématiquement.' },
      { q: 'Comment savoir si une réponse est fiable ?', r: 'Ouvrez les sources citées, vérifiez la version du texte en vigueur et comparez avec votre propre analyse.' },
      { q: 'L’IA comprend-elle l’arabe juridique marocain ?', r: 'La qualité varie selon l’outil et le sujet. Testez-la sur des cas dont vous connaissez déjà la réponse avant de l’utiliser en pratique.' },
    ],
    sources: [SRC.cndp, SRC.sgg],
    lies: ['alertes-whatsapp', 'facturation-honoraires', 'clients-dossiers'],
  },
}
