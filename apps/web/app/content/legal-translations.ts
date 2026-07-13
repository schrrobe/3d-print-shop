export type LegalDocumentKey = 'imprint' | 'privacy' | 'terms' | 'withdrawal'

export interface LegalSection {
  heading: string
  paragraphs: string[]
  form?: string[]
}

export interface LegalDocumentTranslation {
  updatedAt: string
  sections: LegalSection[]
}

const en: Record<LegalDocumentKey, LegalDocumentTranslation> = {
  imprint: {
    updatedAt: 'Last updated: 13 July 2026',
    sections: [
      {
        heading: 'Information pursuant to section 5 DDG',
        paragraphs: ['Robert Schreiner\nKapitelwiese 14\n44263 Dortmund\nGermany'],
      },
      { heading: 'Contact', paragraphs: ['Email: info@prestige-webdesign.de'] },
      {
        heading: 'Business activity',
        paragraphs: ['Manufacture and sale of individually produced 3D-printed products.'],
      },
      {
        heading: 'Responsible for content pursuant to section 18(2) MStV',
        paragraphs: ['Robert Schreiner\nKapitelwiese 14\n44263 Dortmund\nGermany'],
      },
      {
        heading: 'Liability for content and links',
        paragraphs: [
          'We prepare this website with due care but cannot guarantee that all information is correct, complete or up to date. External websites linked from this website are the responsibility of their respective operators. We will remove links to unlawful content without delay once we become aware of them.',
        ],
      },
      {
        heading: 'Copyright',
        paragraphs: [
          'The content and works published on this website are protected by German copyright law. Any use outside the limits of copyright law requires the prior written consent of Robert Schreiner or the respective rights holder.',
        ],
      },
    ],
  },
  privacy: {
    updatedAt: 'Last updated: 13 July 2026',
    sections: [
      {
        heading: '1. Controller',
        paragraphs: [
          'The controller for processing personal data on this website is Robert Schreiner, Kapitelwiese 14, 44263 Dortmund, Germany; email: info@prestige-webdesign.de. No data protection officer has been appointed.',
        ],
      },
      {
        heading: '2. Hosting and server logs',
        paragraphs: [
          'The website is hosted on a VPS in Germany. To provide and secure it, the server processes IP address, access time, requested page, transferred data volume, referrer URL and browser/device information. The legal basis is Article 6(1)(f) GDPR. Log data is deleted when no longer needed for these purposes.',
        ],
      },
      {
        heading: '3. Cookies and consent management',
        paragraphs: [
          'We use necessary storage for the cart, language, display settings and management of your cookie choice. We store your choice in the browser and document a random identifier, selected categories, version, language, time and user agent to prove consent. You may change or withdraw consent at any time in the footer settings.',
        ],
      },
      {
        heading: '4. Orders, payment and shipping',
        paragraphs: [
          'For orders we process name, billing and delivery address, email address, optional telephone number, order, product, payment and shipping data to perform the contract, allocate payments, issue invoices and dispatch goods (Article 6(1)(b) GDPR). Statutory accounting obligations are processed under Article 6(1)(c) GDPR.',
          'Card payments are processed through Stripe. Bank-transfer payment data is processed to allocate the payment. For Bitcoin payments, our own node generates a payment address and processes the transaction data required for allocation. Blockchain transactions are public and cannot be deleted retrospectively. For delivery, necessary address, contact and order data is passed to DHL or Hermes.',
        ],
      },
      {
        heading: '5. Email, customer area and support',
        paragraphs: [
          'Transactional emails, including confirmations, invoices, quotes and support replies, are sent through Resend. Personal access links to the customer area are sent to the email address provided; their hashes and access events are stored to secure access. We process support requests, complaints and optional attachments in order to handle your request.',
        ],
      },
      {
        heading: '6. Model uploads and quotes',
        paragraphs: [
          'For an upload request we process your contact details, description, quantity, STL or 3MF files and the accepted upload-terms version in order to review the model, prepare a quote and, where applicable, perform a contract (Article 6(1)(b) GDPR). Files are not published.',
        ],
      },
      {
        heading: '7. Google Analytics 4',
        paragraphs: [
          'Google Analytics 4 is loaded only with your consent to the Statistics category. It processes usage, page, device/browser, approximate location and online identifier data to measure reach and improve our offering. The legal basis is consent. Provider: Google Ireland Limited; processing by Google LLC in the USA may occur. You can withdraw consent in the cookie settings. Privacy information: https://policies.google.com/privacy',
        ],
      },
      {
        heading: '8. Meta Pixel',
        paragraphs: [
          'Meta Pixel is loaded only with your consent to the Marketing category. It processes online identifiers, IP address, browser/device data and interaction data to measure advertising, build audiences and attribute campaigns. Provider: Meta Platforms Ireland Limited; processing by Meta Platforms, Inc. in the USA may occur. You can withdraw consent in the cookie settings. Privacy information: https://www.facebook.com/privacy/policy/',
        ],
      },
      {
        heading: '9. Retention periods',
        paragraphs: [
          'We delete personal data once its purpose ends unless a statutory retention obligation or deletion hold applies. Invoices and associated order and payment data are retained for ten years from the end of the calendar year of issue. Uncommissioned upload and quote requests are generally deleted after twelve months; model files are deleted under shorter applicable periods.',
        ],
      },
      {
        heading: '10. Your rights',
        paragraphs: [
          'Subject to statutory conditions, you have rights of access, rectification, erasure, restriction, data portability and objection, and you may withdraw consent with future effect. Contact info@prestige-webdesign.de. You may also lodge a complaint with a data protection supervisory authority; the competent authority is generally the North Rhine-Westphalia data protection authority.',
        ],
      },
    ],
  },
  terms: {
    updatedAt: 'Last updated: 13 July 2026',
    sections: [
      {
        heading: '1. Scope',
        paragraphs: [
          'These terms apply to contracts between Robert Schreiner, Kapitelwiese 14, 44263 Dortmund, Germany, and consumers for goods sold through this online shop.',
        ],
      },
      {
        heading: '2. Contract partner and language',
        paragraphs: [
          'Your contract partner is Robert Schreiner. Contact: info@prestige-webdesign.de. The contract language is German.',
        ],
      },
      {
        heading: '3. Conclusion of contract',
        paragraphs: [
          'Product displays are invitations to order, not binding offers. By placing an order, you make a binding offer. A contract is concluded when we accept it by order confirmation email or dispatch the goods. Quotes for uploaded 3D-print requests remain valid for 14 days and form a contract when accepted.',
        ],
      },
      {
        heading: '4. Products and manufacture',
        paragraphs: [
          'All products are manufactured by 3D printing after the order. You may choose the colours offered for a product. Typical minor 3D-printing variations, such as fine layer lines or minimal surface variations, are not defects where function, stability and durability are unaffected. Screen colour variations are possible.',
        ],
      },
      {
        heading: '5. Prices and shipping costs',
        paragraphs: [
          'All prices are final prices in euros. As a small business within the meaning of section 19 UStG, we do not charge VAT. Shipping is €6.99 within Germany and €15.00 to other EU countries; from an order value of €150.00, delivery is free within Germany and the EU.',
        ],
      },
      {
        heading: '6. Payment',
        paragraphs: [
          'Payment by card through Stripe, bank transfer and Bitcoin is available. Bank transfers are due immediately after contract conclusion. For Bitcoin, the displayed amount must be transferred to the displayed address within the stated payment period. Production starts only after full payment has been received.',
        ],
      },
      {
        heading: '7. Delivery',
        paragraphs: [
          'We deliver to consumers in Germany and other EU countries. Delivery takes 3–8 business days in Germany and 7–14 business days to other EU countries, each after full payment. Individual print requests may take longer; the expected time is stated in the quote. Delivery is by DHL or Hermes.',
        ],
      },
      {
        heading: '8. Retention of title',
        paragraphs: ['Goods remain our property until paid for in full.'],
      },
      {
        heading: '9. Withdrawal',
        paragraphs: [
          'Consumers generally have a statutory right of withdrawal; details are provided in the separate cancellation policy. There is no right of withdrawal for goods not prefabricated and made to the consumer’s individual selection or clearly tailored to personal needs, but only where the statutory requirements are actually met. The consumer bears direct return costs for goods eligible for withdrawal.',
        ],
      },
      {
        heading: '10. Statutory warranty',
        paragraphs: [
          'Statutory warranty rights apply. The provision on functionally neutral production-related variations remains unaffected.',
        ],
      },
      {
        heading: '11. Applicable law',
        paragraphs: [
          'German law applies, excluding the UN Convention on Contracts for the International Sale of Goods. Mandatory consumer protection law at your habitual residence remains unaffected.',
        ],
      },
    ],
  },
  withdrawal: {
    updatedAt: 'Last updated: 13 July 2026',
    sections: [
      {
        heading: 'Right of withdrawal',
        paragraphs: [
          'You have the right to withdraw from this contract within fourteen days without giving any reason.',
          'The withdrawal period is fourteen days from the day on which you, or a third party named by you who is not the carrier, takes possession of the goods. Where goods from one order are delivered separately, the period starts when the last goods are received.',
          'To exercise your right, inform Robert Schreiner, Kapitelwiese 14, 44263 Dortmund, Germany, email info@prestige-webdesign.de, by an unambiguous statement, such as a letter or email. Sending the notice before the deadline is sufficient.',
        ],
      },
      {
        heading: 'Effects of withdrawal',
        paragraphs: [
          'We reimburse all payments received, including standard delivery costs, within fourteen days after receiving your withdrawal notice. We use the original payment method unless agreed otherwise and may withhold reimbursement until goods are returned or return proof is supplied.',
          'Return or hand over goods to Robert Schreiner, Kapitelwiese 14, 44263 Dortmund, Germany, within fourteen days of notifying us. You bear the direct return costs. You are liable for loss in value only from handling beyond what is necessary to examine the goods.',
        ],
      },
      {
        heading: 'Exclusion',
        paragraphs: [
          'There is no right of withdrawal for goods not prefabricated and made to your individual selection or clearly tailored to personal needs, but only where the statutory requirements are actually met.',
        ],
      },
      {
        heading: 'Model withdrawal form',
        paragraphs: ['If you wish to withdraw, complete and return this form.'],
        form: [
          'To: Robert Schreiner\nKapitelwiese 14\n44263 Dortmund\nGermany\nEmail: info@prestige-webdesign.de',
          'I/we (*) hereby withdraw from the contract concluded by me/us (*) for the purchase of the following goods (*) / the provision of the following service (*):',
          'Ordered on (*) / received on (*):',
          'Name of consumer(s):',
          'Address of consumer(s):',
          'Date:',
          'Signature of consumer(s) (only if notified on paper):',
          '(*) Delete as applicable.',
        ],
      },
    ],
  },
}

const fr: Record<LegalDocumentKey, LegalDocumentTranslation> = {
  imprint: {
    updatedAt: 'Dernière mise à jour : 13 juillet 2026',
    sections: [
      {
        heading: 'Informations légales',
        paragraphs: [
          'Robert Schreiner\nKapitelwiese 14\n44263 Dortmund\nAllemagne\nE-mail : info@prestige-webdesign.de',
        ],
      },
      {
        heading: 'Activité et responsabilité',
        paragraphs: [
          'Fabrication et vente de produits imprimés en 3D réalisés individuellement. Responsable du contenu : Robert Schreiner, à l’adresse ci-dessus.',
        ],
      },
      {
        heading: 'Responsabilité et droit d’auteur',
        paragraphs: [
          'Le contenu est préparé avec soin, sans garantie d’exactitude, d’exhaustivité ou d’actualité. Les exploitants des sites externes sont responsables de leur contenu ; les liens illicites sont retirés dès que nous en avons connaissance. Les contenus sont protégés par le droit d’auteur allemand et toute utilisation hors des limites légales exige l’accord écrit préalable du titulaire des droits.',
        ],
      },
    ],
  },
  privacy: {
    updatedAt: 'Dernière mise à jour : 13 juillet 2026',
    sections: [
      {
        heading: 'Responsable et hébergement',
        paragraphs: [
          'Le responsable est Robert Schreiner, Kapitelwiese 14, 44263 Dortmund, Allemagne, info@prestige-webdesign.de. Aucun délégué à la protection des données n’est désigné. Le site est hébergé sur un VPS en Allemagne. Pour son fonctionnement et sa sécurité, nous traitons notamment l’adresse IP, l’heure, la page consultée, le référent et les données du navigateur (art. 6, paragraphe 1, point f, RGPD), puis les supprimons lorsqu’elles ne sont plus nécessaires.',
        ],
      },
      {
        heading: 'Commandes, paiement et service',
        paragraphs: [
          'Nous traitons les coordonnées, données de commande, de paiement et de livraison pour exécuter le contrat, facturer et expédier (art. 6, paragraphe 1, points b et c, RGPD). Stripe traite les paiements par carte ; les données nécessaires sont transmises à DHL ou Hermes. Notre nœud Bitcoin traite les adresses et transactions nécessaires ; les transactions blockchain sont publiques. Les e-mails transactionnels sont envoyés via Resend. Les accès au portail client, demandes d’assistance, réclamations, fichiers STL/3MF et offres sont traités pour fournir le service ; les fichiers ne sont pas publiés.',
        ],
      },
      {
        heading: 'Cookies, analyse et droits',
        paragraphs: [
          'Les réglages nécessaires du panier, de la langue et du consentement sont stockés dans le navigateur. Google Analytics 4 ne se charge qu’avec le consentement Statistiques et Meta Pixel uniquement avec le consentement Marketing ; ces services peuvent traiter identifiants en ligne, IP, données d’appareil et d’utilisation, également aux États-Unis. Le consentement peut être retiré dans le footer. Les factures et données associées sont conservées dix ans ; les demandes non commandées sont généralement supprimées après douze mois. Vous disposez des droits d’accès, rectification, effacement, limitation, portabilité, opposition et retrait du consentement ; contactez info@prestige-webdesign.de ou l’autorité de Rhénanie-du-Nord–Westphalie.',
        ],
      },
    ],
  },
  terms: {
    updatedAt: 'Dernière mise à jour : 13 juillet 2026',
    sections: [
      {
        heading: 'Champ d’application et conclusion',
        paragraphs: [
          'Ces conditions s’appliquent aux contrats entre Robert Schreiner et les consommateurs. La langue du contrat est l’allemand. Les produits présentés constituent une invitation à commander ; le contrat est conclu par confirmation de commande ou expédition. Les offres pour fichiers téléversés sont valables 14 jours et sont conclues lors de leur acceptation.',
        ],
      },
      {
        heading: 'Produits, prix, paiement et livraison',
        paragraphs: [
          'Les produits sont fabriqués après commande par impression 3D. Les légères traces de couche et variations qui n’affectent pas fonction, stabilité ou durabilité ne constituent pas un défaut. Les prix sont finaux en euros ; aucune TVA n’est facturée conformément à l’article 19 UStG. Paiement par Stripe, virement ou Bitcoin ; production après paiement intégral. Livraison : Allemagne 3–8 jours ouvrés, 6,99 € ; autres pays de l’UE 7–14 jours ouvrés, 15,00 € ; gratuite à partir de 150,00 €. DHL ou Hermes assure la livraison.',
        ],
      },
      {
        heading: 'Rétractation, garantie et droit applicable',
        paragraphs: [
          'Le droit légal de rétractation est décrit séparément ; il est exclu uniquement pour les produits réellement fabriqués selon un choix individuel au sens de la loi. Les frais directs de retour sont à la charge du consommateur. La garantie légale s’applique. Le droit allemand s’applique sans priver les consommateurs de protections impératives de leur pays de résidence.',
        ],
      },
    ],
  },
  withdrawal: {
    updatedAt: 'Dernière mise à jour : 13 juillet 2026',
    sections: [
      {
        heading: 'Droit de rétractation',
        paragraphs: [
          'Vous pouvez vous rétracter dans les quatorze jours sans motif, à compter de la prise de possession des marchandises (ou de la dernière marchandise en cas de livraisons séparées). Informez Robert Schreiner, Kapitelwiese 14, 44263 Dortmund, Allemagne, info@prestige-webdesign.de, par une déclaration claire avant l’expiration du délai.',
        ],
      },
      {
        heading: 'Effets et exclusion',
        paragraphs: [
          'Nous remboursons les paiements et frais de livraison standard dans les quatorze jours ; nous pouvons attendre le retour des biens ou sa preuve. Retournez les biens à l’adresse ci-dessus dans les quatorze jours ; vous supportez les frais directs de retour. Le droit n’existe pas pour les biens non préfabriqués fabriqués selon un choix individuel déterminant, uniquement lorsque les conditions légales sont remplies.',
        ],
      },
      {
        heading: 'Formulaire type',
        paragraphs: ['Si vous souhaitez vous rétracter, remplissez et renvoyez ce formulaire.'],
        form: [
          'À : Robert Schreiner\nKapitelwiese 14\n44263 Dortmund\nAllemagne\nE-mail : info@prestige-webdesign.de',
          'Je/nous (*) vous notifie/notifions par la présente ma/notre rétractation du contrat portant sur la vente du bien (*) / la prestation de service (*) ci-dessous :',
          'Commandé le (*) / reçu le (*) :\nNom et adresse du/des consommateur(s) :\nDate :\nSignature (uniquement sur papier) :\n(*) Rayez la mention inutile.',
        ],
      },
    ],
  },
}

const nl: Record<LegalDocumentKey, LegalDocumentTranslation> = {
  imprint: {
    updatedAt: 'Laatst bijgewerkt: 13 juli 2026',
    sections: [
      {
        heading: 'Wettelijke informatie',
        paragraphs: [
          'Robert Schreiner\nKapitelwiese 14\n44263 Dortmund\nDuitsland\nE-mail: info@prestige-webdesign.de',
        ],
      },
      {
        heading: 'Activiteit en verantwoordelijkheid',
        paragraphs: [
          'Productie en verkoop van individueel vervaardigde 3D-geprinte producten. Verantwoordelijk voor de inhoud: Robert Schreiner, op bovenstaand adres.',
        ],
      },
      {
        heading: 'Aansprakelijkheid en auteursrecht',
        paragraphs: [
          'De inhoud wordt zorgvuldig opgesteld, maar wij kunnen de juistheid, volledigheid en actualiteit niet garanderen. Exploitanten van externe websites zijn verantwoordelijk voor hun inhoud; links naar onrechtmatige inhoud worden verwijderd zodra wij daarvan kennisnemen. De inhoud is beschermd door het Duitse auteursrecht; gebruik buiten de wettelijke grenzen vereist voorafgaande schriftelijke toestemming van de rechthebbende.',
        ],
      },
    ],
  },
  privacy: {
    updatedAt: 'Laatst bijgewerkt: 13 juli 2026',
    sections: [
      {
        heading: 'Verwerkingsverantwoordelijke en hosting',
        paragraphs: [
          'Verwerkingsverantwoordelijke is Robert Schreiner, Kapitelwiese 14, 44263 Dortmund, Duitsland, info@prestige-webdesign.de. Er is geen functionaris voor gegevensbescherming aangewezen. De website draait op een VPS in Duitsland. Voor werking en beveiliging verwerken wij onder meer IP-adres, tijdstip, opgeroepen pagina, referrer en browsergegevens (art. 6 lid 1 onder f AVG) en verwijderen die wanneer ze niet meer nodig zijn.',
        ],
      },
      {
        heading: 'Bestellingen, betaling en dienstverlening',
        paragraphs: [
          'Wij verwerken contact-, bestel-, betaal- en bezorggegevens om de overeenkomst uit te voeren, facturen op te stellen en goederen te verzenden (art. 6 lid 1 onder b en c AVG). Stripe verwerkt kaartbetalingen; noodzakelijke gegevens gaan naar DHL of Hermes. Onze eigen Bitcoin-node verwerkt benodigde betaaladressen en transacties; blockchaintransacties zijn openbaar. Transactionele e-mails worden via Resend verzonden. Toegang tot het klantenportaal, supportvragen, klachten, bijlagen, STL/3MF-bestanden en offertes worden verwerkt om de dienst te leveren; bestanden worden niet gepubliceerd.',
        ],
      },
      {
        heading: 'Cookies, analyse en rechten',
        paragraphs: [
          'Noodzakelijke instellingen voor winkelwagen, taal en toestemming worden in de browser opgeslagen. Google Analytics 4 wordt alleen geladen met toestemming voor Statistiek en Meta Pixel alleen met toestemming voor Marketing; deze diensten kunnen online-identificatoren, IP-adres, apparaat- en gebruiksgegevens verwerken, ook in de VS. Toestemming kan in de footer worden ingetrokken. Facturen en bijbehorende gegevens worden tien jaar bewaard; niet-opgedragen aanvragen worden doorgaans na twaalf maanden verwijderd. Je hebt recht op inzage, rectificatie, verwijdering, beperking, overdraagbaarheid, bezwaar en intrekking van toestemming; neem contact op via info@prestige-webdesign.de of met de toezichthouder in Noordrijn-Westfalen.',
        ],
      },
    ],
  },
  terms: {
    updatedAt: 'Laatst bijgewerkt: 13 juli 2026',
    sections: [
      {
        heading: 'Toepassing en overeenkomst',
        paragraphs: [
          'Deze voorwaarden gelden voor overeenkomsten tussen Robert Schreiner en consumenten. De overeenkomststaal is Duits. Productweergaven zijn een uitnodiging om te bestellen; de overeenkomst ontstaat door orderbevestiging of verzending. Offertes voor geüploade bestanden zijn 14 dagen geldig en komen tot stand door aanvaarding.',
        ],
      },
      {
        heading: 'Producten, prijzen, betaling en levering',
        paragraphs: [
          'Producten worden na bestelling met 3D-printing vervaardigd. Lichte laaglijnen en variaties die functie, stabiliteit of duurzaamheid niet beïnvloeden, zijn geen gebrek. Prijzen zijn eindprijzen in euro; op grond van § 19 UStG wordt geen btw berekend. Betaling is mogelijk via Stripe, bankoverschrijving of Bitcoin; productie begint na volledige betaling. Levering: Duitsland 3–8 werkdagen, € 6,99; overige EU-landen 7–14 werkdagen, € 15,00; gratis vanaf € 150,00. DHL of Hermes verzorgt de bezorging.',
        ],
      },
      {
        heading: 'Herroeping, garantie en recht',
        paragraphs: [
          'Het wettelijke herroepingsrecht wordt afzonderlijk toegelicht; het is alleen uitgesloten voor goederen die daadwerkelijk volgens een individuele keuze in de zin van de wet worden gemaakt. De directe retourkosten zijn voor de consument. De wettelijke garantie geldt. Duits recht is van toepassing zonder consumenten de dwingende bescherming van hun woonland te ontnemen.',
        ],
      },
    ],
  },
  withdrawal: {
    updatedAt: 'Laatst bijgewerkt: 13 juli 2026',
    sections: [
      {
        heading: 'Herroepingsrecht',
        paragraphs: [
          'Je kunt de overeenkomst binnen veertien dagen zonder opgave van redenen herroepen, gerekend vanaf de ontvangst van de goederen (of van de laatste goederen bij afzonderlijke leveringen). Informeer Robert Schreiner, Kapitelwiese 14, 44263 Dortmund, Duitsland, info@prestige-webdesign.de, vóór afloop van de termijn met een duidelijke verklaring.',
        ],
      },
      {
        heading: 'Gevolgen en uitsluiting',
        paragraphs: [
          'Wij betalen betalingen en standaardleveringskosten binnen veertien dagen terug; wij mogen wachten tot de goederen zijn terugontvangen of het bewijs van verzending is geleverd. Stuur de goederen binnen veertien dagen terug naar bovenstaand adres; de directe retourkosten zijn voor jou. Herroeping is niet mogelijk voor niet-vooraf vervaardigde goederen die op basis van een doorslaggevende individuele keuze zijn gemaakt, uitsluitend wanneer de wettelijke voorwaarden daadwerkelijk zijn vervuld.',
        ],
      },
      {
        heading: 'Modelformulier voor herroeping',
        paragraphs: [
          'Vul dit formulier alleen in en stuur het terug als je de overeenkomst wilt herroepen.',
        ],
        form: [
          'Aan: Robert Schreiner\nKapitelwiese 14\n44263 Dortmund\nDuitsland\nE-mail: info@prestige-webdesign.de',
          'Hierbij herroep(en) ik/wij (*) de door mij/ons (*) gesloten overeenkomst betreffende de koop van de volgende goederen (*) / de levering van de volgende dienst (*):',
          'Besteld op (*) / ontvangen op (*):\nNaam en adres van consument(en):\nDatum:\nHandtekening (alleen op papier):\n(*) Doorhalen wat niet van toepassing is.',
        ],
      },
    ],
  },
}

const pl: Record<LegalDocumentKey, LegalDocumentTranslation> = {
  imprint: {
    updatedAt: 'Ostatnia aktualizacja: 13 lipca 2026 r.',
    sections: [
      {
        heading: 'Informacje prawne',
        paragraphs: [
          'Robert Schreiner\nKapitelwiese 14\n44263 Dortmund\nNiemcy\nE-mail: info@prestige-webdesign.de',
        ],
      },
      {
        heading: 'Działalność i odpowiedzialność',
        paragraphs: [
          'Produkcja i sprzedaż indywidualnie wykonywanych produktów drukowanych w 3D. Osoba odpowiedzialna za treść: Robert Schreiner, pod powyższym adresem.',
        ],
      },
      {
        heading: 'Odpowiedzialność i prawa autorskie',
        paragraphs: [
          'Treści przygotowujemy z należytą starannością, lecz nie gwarantujemy ich poprawności, kompletności ani aktualności. Operatorzy zewnętrznych stron odpowiadają za własne treści; odnośniki do treści bezprawnych usuwamy po uzyskaniu informacji. Treści są chronione niemieckim prawem autorskim; korzystanie poza granicami ustawowymi wymaga uprzedniej pisemnej zgody uprawnionego.',
        ],
      },
    ],
  },
  privacy: {
    updatedAt: 'Ostatnia aktualizacja: 13 lipca 2026 r.',
    sections: [
      {
        heading: 'Administrator i hosting',
        paragraphs: [
          'Administratorem jest Robert Schreiner, Kapitelwiese 14, 44263 Dortmund, Niemcy, info@prestige-webdesign.de. Nie wyznaczono inspektora ochrony danych. Strona działa na VPS w Niemczech. Dla działania i bezpieczeństwa przetwarzamy m.in. adres IP, czas, wywołaną stronę, referrer i dane przeglądarki (art. 6 ust. 1 lit. f RODO), a następnie usuwamy je, gdy nie są już potrzebne.',
        ],
      },
      {
        heading: 'Zamówienia, płatności i obsługa',
        paragraphs: [
          'Przetwarzamy dane kontaktowe, zamówienia, płatności i dostawy, aby wykonać umowę, wystawić faktury i wysłać towar (art. 6 ust. 1 lit. b i c RODO). Stripe obsługuje płatności kartą; konieczne dane przekazujemy DHL lub Hermes. Nasz własny węzeł Bitcoin przetwarza wymagane adresy płatnicze i transakcje; transakcje blockchain są publiczne. E-maile transakcyjne wysyłamy przez Resend. Dostęp do portalu klienta, zgłoszenia wsparcia, reklamacje, załączniki, pliki STL/3MF i oferty przetwarzamy w celu świadczenia usługi; pliki nie są publikowane.',
        ],
      },
      {
        heading: 'Pliki cookies, analityka i prawa',
        paragraphs: [
          'Niezbędne ustawienia koszyka, języka i zgody są zapisywane w przeglądarce. Google Analytics 4 ładuje się wyłącznie za zgodą na Statystyki, a Meta Pixel wyłącznie za zgodą na Marketing; usługi te mogą przetwarzać identyfikatory online, IP oraz dane urządzenia i użycia, także w USA. Zgodę można wycofać w stopce. Faktury i powiązane dane przechowujemy dziesięć lat; niezrealizowane zapytania zasadniczo usuwamy po dwunastu miesiącach. Przysługuje Ci prawo dostępu, sprostowania, usunięcia, ograniczenia, przenoszenia, sprzeciwu i cofnięcia zgody; skontaktuj się przez info@prestige-webdesign.de lub z organem nadzorczym Nadrenii Północnej-Westfalii.',
        ],
      },
    ],
  },
  terms: {
    updatedAt: 'Ostatnia aktualizacja: 13 lipca 2026 r.',
    sections: [
      {
        heading: 'Zakres i zawarcie umowy',
        paragraphs: [
          'Warunki dotyczą umów między Robertem Schreinerem a konsumentami. Językiem umowy jest niemiecki. Prezentacja produktów jest zaproszeniem do złożenia zamówienia; umowa zostaje zawarta przez potwierdzenie zamówienia lub wysyłkę. Oferty dotyczące przesłanych plików są ważne 14 dni i zostają zawarte po ich przyjęciu.',
        ],
      },
      {
        heading: 'Produkty, ceny, płatność i dostawa',
        paragraphs: [
          'Produkty są wykonywane po zamówieniu metodą druku 3D. Drobne warstwy i odchylenia, które nie wpływają na funkcję, stabilność ani trwałość, nie stanowią wady. Ceny są cenami końcowymi w euro; zgodnie z § 19 UStG nie naliczamy VAT. Dostępne są Stripe, przelew bankowy i Bitcoin; produkcja zaczyna się po pełnej płatności. Dostawa: Niemcy 3–8 dni roboczych, 6,99 €; pozostałe kraje UE 7–14 dni roboczych, 15,00 €; bezpłatnie od 150,00 €. Dostarcza DHL lub Hermes.',
        ],
      },
      {
        heading: 'Odstąpienie, rękojmia i prawo',
        paragraphs: [
          'Ustawowe prawo odstąpienia opisano osobno; jest wyłączone tylko dla towarów rzeczywiście wykonanych według indywidualnego wyboru w rozumieniu prawa. Bezpośrednie koszty zwrotu ponosi konsument. Obowiązuje ustawowa odpowiedzialność za wady. Stosuje się prawo niemieckie bez pozbawiania konsumentów bezwzględnie obowiązującej ochrony państwa ich zwykłego pobytu.',
        ],
      },
    ],
  },
  withdrawal: {
    updatedAt: 'Ostatnia aktualizacja: 13 lipca 2026 r.',
    sections: [
      {
        heading: 'Prawo odstąpienia',
        paragraphs: [
          'Możesz odstąpić od umowy w ciągu czternastu dni bez podania przyczyny, licząc od otrzymania towaru (lub ostatniego towaru przy osobnych dostawach). Przed upływem terminu poinformuj Roberta Schreiner, Kapitelwiese 14, 44263 Dortmund, Niemcy, info@prestige-webdesign.de, w jednoznacznym oświadczeniu.',
        ],
      },
      {
        heading: 'Skutki i wyłączenie',
        paragraphs: [
          'Zwracamy płatności i standardowe koszty dostawy w ciągu czternastu dni; możemy wstrzymać zwrot do otrzymania towaru lub dowodu nadania. Zwróć towar na powyższy adres w ciągu czternastu dni; bezpośrednie koszty zwrotu ponosisz Ty. Prawo nie przysługuje dla towarów niewyprodukowanych z góry, wykonanych według decydującego indywidualnego wyboru, tylko gdy warunki ustawowe są rzeczywiście spełnione.',
        ],
      },
      {
        heading: 'Wzór formularza odstąpienia',
        paragraphs: ['Wypełnij i odeślij formularz tylko wtedy, gdy chcesz odstąpić od umowy.'],
        form: [
          'Do: Robert Schreiner\nKapitelwiese 14\n44263 Dortmund\nNiemcy\nE-mail: info@prestige-webdesign.de',
          'Niniejszym informuję/informujemy (*) o moim/naszym odstąpieniu od umowy sprzedaży następujących towarów (*) / świadczenia następującej usługi (*):',
          'Zamówiono dnia (*) / otrzymano dnia (*):\nImię, nazwisko i adres konsumenta(-ów):\nData:\nPodpis (tylko na papierze):\n(*) Niepotrzebne skreślić.',
        ],
      },
    ],
  },
}

const cs: Record<LegalDocumentKey, LegalDocumentTranslation> = {
  imprint: {
    updatedAt: 'Aktualizováno: 13. 7. 2026',
    sections: [
      {
        heading: 'Právní informace',
        paragraphs: [
          'Robert Schreiner\nKapitelwiese 14\n44263 Dortmund\nNěmecko\nE-mail: info@prestige-webdesign.de',
        ],
      },
      {
        heading: 'Činnost a odpovědnost',
        paragraphs: [
          'Výroba a prodej individuálně vyráběných produktů z 3D tisku. Za obsah odpovídá Robert Schreiner na výše uvedené adrese.',
        ],
      },
      {
        heading: 'Odpovědnost a autorské právo',
        paragraphs: [
          'Obsah připravujeme pečlivě, nemůžeme však zaručit jeho správnost, úplnost ani aktuálnost. Provozovatelé externích webů odpovídají za svůj obsah; odkazy na protiprávní obsah odstraníme, jakmile se o něm dozvíme. Obsah je chráněn německým autorským právem a užití nad zákonný rámec vyžaduje předchozí písemný souhlas držitele práv.',
        ],
      },
    ],
  },
  privacy: {
    updatedAt: 'Aktualizováno: 13. 7. 2026',
    sections: [
      {
        heading: 'Správce a hosting',
        paragraphs: [
          'Správcem je Robert Schreiner, Kapitelwiese 14, 44263 Dortmund, Německo, info@prestige-webdesign.de. Pověřenec pro ochranu osobních údajů nebyl jmenován. Web běží na VPS v Německu. Pro provoz a bezpečnost zpracováváme mimo jiné IP adresu, čas, navštívenou stránku, referrer a údaje prohlížeče (čl. 6 odst. 1 písm. f GDPR) a mažeme je, jakmile nejsou potřebné.',
        ],
      },
      {
        heading: 'Objednávky, platby a služby',
        paragraphs: [
          'Zpracováváme kontaktní, objednávkové, platební a doručovací údaje pro plnění smlouvy, vystavení faktur a odeslání zboží (čl. 6 odst. 1 písm. b a c GDPR). Stripe zpracovává platby kartou; nutné údaje předáváme DHL nebo Hermes. Náš vlastní bitcoinový uzel zpracovává potřebné platební adresy a transakce; blockchainové transakce jsou veřejné. Transakční e-maily odesíláme přes Resend. Přístupy do zákaznického portálu, podporu, reklamace, přílohy, soubory STL/3MF a nabídky zpracováváme pro poskytování služby; soubory nezveřejňujeme.',
        ],
      },
      {
        heading: 'Cookies, analýza a práva',
        paragraphs: [
          'Nezbytná nastavení košíku, jazyka a souhlasu ukládáme v prohlížeči. Google Analytics 4 se načítá pouze se souhlasem pro Statistiky a Meta Pixel pouze se souhlasem pro Marketing; tyto služby mohou zpracovávat online identifikátory, IP a údaje o zařízení a užití, také v USA. Souhlas lze odvolat v patičce. Faktury a související údaje uchováváme deset let; nerealizované žádosti zpravidla mažeme po dvanácti měsících. Máš právo na přístup, opravu, výmaz, omezení, přenositelnost, námitku a odvolání souhlasu; kontaktuj info@prestige-webdesign.de nebo dozorový úřad v Severním Porýní-Vestfálsku.',
        ],
      },
    ],
  },
  terms: {
    updatedAt: 'Aktualizováno: 13. 7. 2026',
    sections: [
      {
        heading: 'Rozsah a uzavření smlouvy',
        paragraphs: [
          'Tyto podmínky platí pro smlouvy mezi Robertem Schreinerem a spotřebiteli. Jazykem smlouvy je němčina. Prezentace produktů je výzvou k objednávce; smlouva vzniká potvrzením objednávky nebo odesláním. Nabídky k nahraným souborům platí 14 dní a smlouva vzniká jejich přijetím.',
        ],
      },
      {
        heading: 'Produkty, ceny, platba a doručení',
        paragraphs: [
          'Produkty jsou vyráběny po objednávce 3D tiskem. Drobné vrstvy a odchylky, které neovlivňují funkci, stabilitu ani životnost, nejsou vadou. Ceny jsou konečné v eurech; podle § 19 UStG neúčtujeme DPH. Platit lze přes Stripe, bankovním převodem nebo Bitcoinem; výroba začíná po úplné úhradě. Doručení: Německo 3–8 pracovních dnů, 6,99 €; ostatní země EU 7–14 pracovních dnů, 15,00 €; zdarma od 150,00 €. Doručuje DHL nebo Hermes.',
        ],
      },
      {
        heading: 'Odstoupení, záruka a právo',
        paragraphs: [
          'Zákonné právo na odstoupení je popsáno samostatně; je vyloučeno jen u zboží skutečně vyrobeného podle rozhodující individuální volby ve smyslu zákona. Přímé náklady na vrácení nese spotřebitel. Platí zákonná odpovědnost za vady. Použije se německé právo, aniž by spotřebitel ztratil kogentní ochranu země svého obvyklého bydliště.',
        ],
      },
    ],
  },
  withdrawal: {
    updatedAt: 'Aktualizováno: 13. 7. 2026',
    sections: [
      {
        heading: 'Právo na odstoupení',
        paragraphs: [
          'Od smlouvy můžeš odstoupit do čtrnácti dnů bez uvedení důvodu, počítáno od převzetí zboží (nebo posledního zboží při samostatných dodávkách). Před uplynutím lhůty informuj Roberta Schreiner, Kapitelwiese 14, 44263 Dortmund, Německo, info@prestige-webdesign.de, jednoznačným prohlášením.',
        ],
      },
      {
        heading: 'Důsledky a výjimka',
        paragraphs: [
          'Platby a náklady na standardní doručení vrátíme do čtrnácti dnů; vrácení můžeme zadržet do obdržení zboží nebo dokladu o odeslání. Zboží vrať na výše uvedenou adresu do čtrnácti dnů; přímé náklady na vrácení neseš ty. Právo neexistuje pro nepředem vyrobené zboží vyrobené podle rozhodující individuální volby, pouze pokud jsou zákonné podmínky skutečně splněny.',
        ],
      },
      {
        heading: 'Vzorový formulář',
        paragraphs: ['Formulář vyplň a odešli pouze tehdy, pokud chceš od smlouvy odstoupit.'],
        form: [
          'Komu: Robert Schreiner\nKapitelwiese 14\n44263 Dortmund\nNěmecko\nE-mail: info@prestige-webdesign.de',
          'Tímto oznamuji/oznamujeme (*), že odstupuji/odstupujeme (*) od smlouvy o koupi následujícího zboží (*) / poskytnutí následující služby (*):',
          'Objednáno dne (*) / převzato dne (*):\nJméno a adresa spotřebitele(-ů):\nDatum:\nPodpis (jen na papíře):\n(*) Nehodící se škrtněte.',
        ],
      },
    ],
  },
}

export function getLegalTranslation(
  locale: string,
  key: LegalDocumentKey,
): LegalDocumentTranslation | null {
  if (locale === 'en') return en[key]
  if (locale === 'fr') return fr[key]
  if (locale === 'nl') return nl[key]
  if (locale === 'pl') return pl[key]
  if (locale === 'cs') return cs[key]
  return null
}
