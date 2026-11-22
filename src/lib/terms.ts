// The Terms of Service, in English and Hindi, as data. The page is app/(main)/terms/page.tsx.
//
// {email} and {officer} are filled in from src/lib/legal.ts, and [[privacy]] becomes a
// link to the Privacy Notice.
//
// When these change in a way that matters, raise PRIVACY_NOTICE_VERSION in
// src/lib/legal.ts so everyone is asked to agree again.
//
// The Hindi text has not been checked by a native speaker or a lawyer yet. Have both
// look at it before launch. If the two versions differ, the English one applies.

export type TermsClause = string | { text: string; list: string[] };
export type TermsSection = { title: string; clauses: TermsClause[] };

export type Terms = {
  title: string;
  updated: string;
  intro: string;
  reviewWarning: string;
  tocLabel: string;
  privacyLinkText: string;
  sections: TermsSection[];
};

export const TERMS: Record<'en' | 'hi', Terms> = {
  en: {
    title: 'Terms of Service',
    updated: 'Last updated',
    intro:
      'These Terms are the rules for using GoodsMandi. By creating an account or using the Platform, you agree to them. Please read them, especially the sections on safety, prohibited items and liability.',
    reviewWarning: 'These Terms were written by the GoodsMandi team and have not yet been reviewed by a lawyer.',
    tocLabel: 'Sections',
    privacyLinkText: 'Privacy Notice',
    sections: [
      {
        title: 'Who can use GoodsMandi',
        clauses: [
          'GoodsMandi ("the Platform", "we") is open only to currently enrolled students of the college who sign up with a valid college email address and confirm it.',
          'By signing up you confirm that you are a currently enrolled student of the college, that the details you give us (name, year, branch) are true, and that you are at least 18 years old. GoodsMandi is not for anyone under 18. If we find that an account belongs to someone under 18, we will close it and erase its data.',
          "One person may have only one account. You may not share, sell, lend or transfer your account, or use someone else's.",
          'You are responsible for everything done through your account and for keeping your password secret. Tell us straight away at {email} if you think someone else has used your account.',
          'If you stop being an enrolled student, you may finish deals already in progress but must not start new ones. We may close accounts we cannot verify.',
        ],
      },
      {
        title: 'What the Platform is, and is not',
        clauses: [
          'The Platform is a listing and messaging service. It lets students list their own items, receive offers from other students, and chat to arrange a sale.',
          'All payment and handover of items happens directly between users, offline, outside the Platform. We do not handle money, hold funds, check items, deliver anything, or take part in any deal.',
          'We are not a party to any deal between a buyer and a seller and are not responsible for its outcome. This includes non-payment, non-delivery, an item not matching its listing, fake or counterfeit currency, or any other dispute.',
          'You trade at your own risk. Meet in safe, public places on campus, check the item before paying, and never pay in advance to someone you have not met.',
          'GoodsMandi is an independent student project. It is not run, endorsed or supervised by the college unless the college says so in writing. The college is not responsible for the Platform or for deals made on it.',
          'The Platform is free to use. If we ever introduce fees, we will tell you before they apply and they will not apply to deals already in progress.',
        ],
      },
      {
        title: 'Listings',
        clauses: [
          'You may only list personal items that you own and are allowed to sell. The Platform is for students selling their own things, not for running a business, reselling in bulk, or advertising services.',
          'Sellers are solely responsible for their listings being accurate and honest, including the title, description, category, age, condition, photos and price. Do not hide known defects.',
          'Photos must be of the actual item you are selling, or clearly marked as stock photos. Do not use photos you do not have the right to use.',
          {
            text: 'You must not list any of the following:',
            list: [
              'alcohol, tobacco, vapes, drugs or other controlled substances',
              'medicines, prescription items or anything requiring a licence to sell',
              'weapons, ammunition, knives meant as weapons, explosives, gas cylinders or other dangerous goods',
              'stolen, counterfeit or replica goods',
              'property of the college, a hostel or anyone else (for example hostel furniture, lab equipment or library books)',
              "college ID cards, accounts, passwords, OTPs, SIM cards or anyone's personal data",
              'exam papers, answer keys, or any material or service meant for cheating, including writing assignments, projects or exams for someone else, or proxy attendance',
              'animals, adult content, currency, gift cards, lottery or betting products',
              'anything illegal to sell or own under Indian law or against college rules',
            ],
          },
          'Do not post duplicate listings, spam, misleading prices, or listings meant to collect offers without a real intention to sell.',
          'A listing that has been up for 60 days and has had no new offers in the last 14 days is taken down automatically. You can put it up again from My listings.',
          'We may remove any listing that breaks these Terms, or that we reasonably think is unsafe or unlawful, without notice.',
        ],
      },
      {
        title: 'Offers and sales',
        clauses: [
          'Buyers can make an offer on any active listing. Offers are private: only the seller sees all offers on their listing.',
          "An offer must be at least 70% of the seller's asking price. Lower offers are refused automatically.",
          'A buyer can change their offer at most twice (three offers in total) while it is still waiting for the seller.',
          'The seller may accept any offer, or none. They do not have to accept the highest one. Accepting an offer marks the item as sold. The seller may also choose one backup buyer in case the deal falls through.',
          'Making or accepting an offer is a promise to try in good faith to complete the deal at that price. It is not a payment, and the Platform does not enforce it. Repeatedly not showing up, or backing out after your offer is accepted, can be reported as a No-show.',
          'You must not make offers on your own listings, including through another account or with the help of friends, and you must not make fake offers to push the price up or put off other buyers.',
          "Once a deal is agreed, both sides should not change the price or terms at the meet-up without the other's free agreement.",
        ],
      },
      {
        title: 'Chat and conduct',
        clauses: [
          'Be respectful. Harassment, threats, hate speech, sexual content, stalking, and abusive or discriminatory language are not allowed anywhere on the Platform.',
          'Use chat only to arrange the sale of the listed item. Do not use it to advertise, spam, ask for prohibited items, or ask for payment in advance.',
          {
            text: 'Anywhere on the Platform (listings, photos, profile, chat, reports), you must not post anything that:',
            list: [
              'belongs to someone else and you have no right to share, or is someone else\'s personal data',
              "is obscene, pornographic, paedophilic, or invades someone's bodily or other privacy",
              'is harmful to children',
              'insults or harasses anyone because of their gender, religion, caste, race or ethnicity',
              'infringes a patent, trademark, copyright or other right',
              'knowingly deceives or misleads, or is clearly false',
              'impersonates another person',
              'threatens the unity, integrity, defence, security or sovereignty of India, its relations with other countries, or public order, or encourages any crime',
              'contains a virus or any code meant to damage or misuse a computer or the Platform',
              'breaks any law in force in India',
            ],
          },
          'Your phone number and email are never shown to other users. Share contact details only if you choose to.',
          "Do not try to get around the Platform's checks, reporting or bans, for example by making a new account after being banned, or by scraping, attacking or overloading the site.",
        ],
      },
      {
        title: 'Reports, warnings and bans',
        clauses: [
          'You can report a user or a listing for: No-show, Harassment, Fake/Prohibited item, or Scam.',
          'An admin reviews every report. A report only becomes a confirmed warning after an admin decides it is valid. Unconfirmed reports do not count against anyone.',
          'An account with three (3) confirmed warnings is banned automatically. A banned account cannot create listings, make offers, chat, rate or report. If you were in the middle of a deal with someone who gets banned, write to {email} and we will help where we can.',
          'For serious cases, such as illegal activity, threats to safety, fraud, or a false identity, we may suspend or ban an account immediately, without earlier warnings, and remove its listings.',
          'Warnings and bans stay with your college email. Deleting your account and signing up again does not remove them.',
          'Making false or malicious reports is itself a breach of these Terms and can lead to a warning on your own account.',
          'If you think a warning or ban was wrong, email {email} within 14 days, explaining why. A person who did not make the original decision will review it where possible, and we will reply within 15 days.',
          'Where we believe someone is in danger or a crime has happened, we may share relevant information with college authorities or the police.',
        ],
      },
      {
        title: 'Ratings',
        clauses: [
          'After a sale, the seller and the accepted buyer can each rate the other once, from 1 to 5 stars. Ratings cannot be edited later.',
          "Ratings must be honest and about the deal. You must not offer or demand a rating in exchange for anything, threaten a bad rating, or arrange fake deals to raise or lower anyone's rating.",
          'We may remove ratings that break these rules.',
        ],
      },
      {
        title: 'Your content',
        clauses: [
          'You keep ownership of the photos and text you post. You give us a free, non-exclusive licence to store, display and resize them for the purpose of running the Platform, for as long as they are on it.',
          "You confirm you have the right to post what you post, and that it does not break anyone else's rights or any law.",
        ],
      },
      {
        title: 'Privacy and your data',
        clauses: [
          {
            text: 'We collect only what we need to run the Platform:',
            list: [
              'your college email, name, year, branch and optional profile photo',
              'your listings, offers, ratings, reports and chat messages',
              'basic technical data needed to keep you logged in and the site secure',
            ],
          },
          'Your email is never shown to other users. Your name, photo, year, branch, rating and active listings are shown to other logged-in students. Photos are stored at web links that are not secret, so anyone given the link to a photo can open it.',
          'Chat messages can be read only by the two people in the conversation. Admins review reports using the information in the report, and can see account details such as your college email and when you last signed in. If you report a conversation, include the relevant messages in your report.',
          'Data is stored with our service providers (see the [[privacy]] for who they are). We do not sell your data or use it for advertising.',
          'You can see, correct or delete your data from Settings, or send a request from Settings or by emailing {email} from your college email. We reply within 15 days. The [[privacy]] explains your rights in full, and what we keep after you delete your account.',
        ],
      },
      {
        title: 'Limitation of liability',
        clauses: [
          {
            text: 'To the maximum extent allowed by law, the Platform, its founders and operators are not liable for any direct, indirect, incidental or consequential loss arising from:',
            list: [
              'any deal or meeting between users',
              'the condition, legality, safety or authenticity of any item',
              'anything that happens during an offline exchange',
              'loss of money or property, or personal harm, connected to using the Platform',
              'the Platform being unavailable, slow, or losing data',
            ],
          },
          'The Platform is provided "as is" and "as available", without any promise that it will be error-free or always available.',
          'Because the Platform is free, our total liability to you for any claim is limited to ₹1,000, to the extent the law allows such a limit.',
          'Nothing in these Terms limits any right you have that cannot legally be limited.',
        ],
      },
      {
        title: 'Indemnity',
        clauses: [
          'If you break these Terms or the law while using the Platform, and someone makes a claim against us because of it, you agree to cover the reasonable costs and losses this causes us.',
        ],
      },
      {
        title: 'Closing accounts',
        clauses: [
          'You can stop using the Platform at any time and delete your account yourself in Settings, "Delete account". If you cannot, email {email}.',
          'When you delete your account, your chats also disappear for the people you chatted with. Reports you made stay, without your name. You cannot delete your account while a report about you is waiting for review. The [[privacy]] explains what we keep.',
          'We may suspend or close an account that breaks these Terms, acts fraudulently, puts other users at risk, or no longer belongs to an enrolled student.',
          'Sections on liability, indemnity, governing law and anything else that by its nature should continue will still apply after an account is closed.',
        ],
      },
      {
        title: 'Changes to these Terms',
        clauses: [
          'We may update these Terms. The date at the top shows the latest version. For important changes we will ask you to agree again the next time you use the Platform.',
          'If you do not agree to the updated Terms, stop using the Platform and delete your account in Settings.',
        ],
      },
      {
        title: 'Governing law and disputes',
        clauses: [
          'These Terms are governed by the laws of India.',
          'Please contact us first at {email} so we can try to resolve any issue informally. If that does not work, the courts of Dehradun, Uttarakhand have exclusive jurisdiction, subject to any right you have by law to go to another court or consumer forum.',
          'Disputes between users about a deal are between those users. We may help by reviewing reports, but we are not required to resolve them.',
        ],
      },
      {
        title: 'General',
        clauses: [
          'If any part of these Terms is found invalid, the rest still applies.',
          'If we do not enforce a rule straight away, we have not given up the right to enforce it later.',
          'These Terms, together with the [[privacy]] and any rules shown on the Platform, are the whole agreement between you and us about using the Platform.',
          'These Terms are available in English and Hindi. If the two differ, the English version applies.',
        ],
      },
      {
        title: 'Contact and grievances',
        clauses: [
          'For questions, complaints, appeals, data requests, or to report content that is unlawful, email {email}. This address is also our Grievance Officer contact under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. Our Grievance Officer is {officer}.',
          'We acknowledge complaints within 24 hours and resolve them within 15 days.',
          'If you complain about content that breaks clause 5.3, we act on it within 72 hours. If content shows someone\'s private areas, nudity or a sexual act, or is a morphed image of them, and they (or someone for them) complain, we remove it within 24 hours.',
        ],
      },
    ],
  },
  hi: {
    title: 'सेवा की शर्तें',
    updated: 'अंतिम बार अपडेट किया गया',
    intro:
      'ये शर्तें GoodsMandi के उपयोग के नियम हैं। खाता बनाकर या प्लेटफ़ॉर्म का उपयोग करके आप इनसे सहमत होते हैं। कृपया इन्हें पढ़ें, ख़ासकर सुरक्षा, प्रतिबंधित वस्तुओं और दायित्व वाले खंड।',
    reviewWarning:
      'ये शर्तें GoodsMandi टीम ने लिखी हैं और अभी किसी वकील द्वारा जाँची नहीं गई हैं। हिंदी पाठ की भी अभी किसी हिंदी भाषी द्वारा समीक्षा नहीं हुई है। दोनों संस्करणों में अंतर हो तो अंग्रेज़ी संस्करण लागू होगा।',
    tocLabel: 'खंड',
    privacyLinkText: 'गोपनीयता सूचना',
    sections: [
      {
        title: 'GoodsMandi का उपयोग कौन कर सकता है',
        clauses: [
          'GoodsMandi ("प्लेटफ़ॉर्म", "हम") केवल कॉलेज के वर्तमान में नामांकित उन छात्रों के लिए है जो वैध कॉलेज ईमेल से साइन-अप करके उसकी पुष्टि करते हैं।',
          'साइन-अप करके आप पुष्टि करते हैं कि आप कॉलेज के वर्तमान में नामांकित छात्र हैं, आपके दिए विवरण (नाम, वर्ष, ब्रांच) सही हैं, और आपकी आयु कम से कम 18 वर्ष है। GoodsMandi 18 वर्ष से कम आयु वालों के लिए नहीं है। यदि पता चले कि कोई खाता 18 वर्ष से कम के व्यक्ति का है, तो हम उसे बंद कर उसका डेटा मिटा देंगे।',
          'एक व्यक्ति का केवल एक खाता हो सकता है। आप अपना खाता साझा, बेच, उधार या किसी को सौंप नहीं सकते, और किसी और का खाता इस्तेमाल नहीं कर सकते।',
          'आपके खाते से होने वाले हर काम और अपना पासवर्ड गुप्त रखने की ज़िम्मेदारी आपकी है। अगर लगे कि किसी और ने आपका खाता इस्तेमाल किया है, तो तुरंत {email} पर बताएँ।',
          'अगर आप नामांकित छात्र नहीं रहते, तो पहले से चल रहे सौदे पूरे कर सकते हैं, पर नए सौदे शुरू नहीं कर सकते। जिन खातों की हम पुष्टि नहीं कर पाते, उन्हें हम बंद कर सकते हैं।',
        ],
      },
      {
        title: 'प्लेटफ़ॉर्म क्या है और क्या नहीं',
        clauses: [
          'प्लेटफ़ॉर्म एक लिस्टिंग और मैसेजिंग सेवा है। इससे छात्र अपनी वस्तुएँ लिस्ट कर सकते हैं, दूसरे छात्रों से ऑफ़र पा सकते हैं, और बिक्री तय करने के लिए चैट कर सकते हैं।',
          'सारा भुगतान और वस्तुओं का लेन-देन उपयोगकर्ताओं के बीच सीधे, ऑफ़लाइन, प्लेटफ़ॉर्म के बाहर होता है। हम पैसे नहीं संभालते, राशि नहीं रखते, वस्तुएँ नहीं जाँचते, कुछ डिलीवर नहीं करते, और किसी सौदे में शामिल नहीं होते।',
          'हम खरीदार और विक्रेता के बीच किसी सौदे के पक्षकार नहीं हैं और उसके परिणाम के लिए ज़िम्मेदार नहीं हैं। इसमें भुगतान न होना, वस्तु न मिलना, वस्तु का लिस्टिंग से मेल न खाना, नकली नोट, या कोई और विवाद शामिल है।',
          'आप अपने जोखिम पर लेन-देन करते हैं। कैंपस में सुरक्षित, सार्वजनिक जगहों पर मिलें, भुगतान से पहले वस्तु जाँचें, और जिससे मिले नहीं उसे कभी पहले से भुगतान न करें।',
          'GoodsMandi एक स्वतंत्र छात्र प्रोजेक्ट है। जब तक कॉलेज लिखित में न कहे, यह कॉलेज द्वारा चलाया, समर्थित या निगरानी किया हुआ नहीं है। कॉलेज प्लेटफ़ॉर्म या उस पर हुए सौदों के लिए ज़िम्मेदार नहीं है।',
          'प्लेटफ़ॉर्म मुफ़्त है। अगर हम कभी शुल्क लाएँगे, तो लागू होने से पहले बताएँगे, और वे पहले से चल रहे सौदों पर लागू नहीं होंगे।',
        ],
      },
      {
        title: 'लिस्टिंग',
        clauses: [
          'आप केवल वही निजी वस्तुएँ लिस्ट कर सकते हैं जो आपकी हैं और जिन्हें बेचने का आपको अधिकार है। प्लेटफ़ॉर्म छात्रों के अपने सामान बेचने के लिए है, व्यापार चलाने, थोक में दोबारा बेचने या सेवाओं के विज्ञापन के लिए नहीं।',
          'लिस्टिंग के सही और ईमानदार होने की पूरी ज़िम्मेदारी विक्रेता की है, जिसमें शीर्षक, विवरण, श्रेणी, उम्र, हालत, फ़ोटो और कीमत शामिल हैं। जानी हुई ख़राबियाँ न छिपाएँ।',
          'फ़ोटो उसी वस्तु की होनी चाहिए जो आप बेच रहे हैं, या साफ़ लिखा हो कि वह स्टॉक फ़ोटो है। ऐसी फ़ोटो इस्तेमाल न करें जिनका आपको अधिकार नहीं है।',
          {
            text: 'आप इनमें से कुछ भी लिस्ट नहीं कर सकते:',
            list: [
              'शराब, तंबाकू, वेप, ड्रग्स या अन्य नियंत्रित पदार्थ',
              'दवाइयाँ, पर्चे वाली वस्तुएँ, या कुछ भी जिसे बेचने के लिए लाइसेंस चाहिए',
              'हथियार, गोला-बारूद, हथियार के रूप में चाकू, विस्फोटक, गैस सिलेंडर या अन्य ख़तरनाक वस्तुएँ',
              'चोरी की, नकली या रेप्लिका वस्तुएँ',
              'कॉलेज, हॉस्टल या किसी और की संपत्ति (जैसे हॉस्टल का फ़र्नीचर, लैब उपकरण या लाइब्रेरी की किताबें)',
              'कॉलेज आईडी कार्ड, खाते, पासवर्ड, OTP, सिम कार्ड या किसी का व्यक्तिगत डेटा',
              'परीक्षा पेपर, उत्तर कुंजी, या नकल के लिए कोई सामग्री या सेवा, जिसमें किसी और के असाइनमेंट, प्रोजेक्ट या परीक्षा लिखना, या प्रॉक्सी हाज़िरी शामिल है',
              'जानवर, वयस्क सामग्री, मुद्रा, गिफ़्ट कार्ड, लॉटरी या सट्टे से जुड़ी चीज़ें',
              'कुछ भी जिसे भारतीय कानून के तहत बेचना या रखना ग़ैरक़ानूनी है या जो कॉलेज के नियमों के ख़िलाफ़ है',
            ],
          },
          'डुप्लिकेट लिस्टिंग, स्पैम, भ्रामक कीमतें, या बेचने के असली इरादे के बिना केवल ऑफ़र जुटाने वाली लिस्टिंग न डालें।',
          'जो लिस्टिंग 60 दिनों से लगी है और जिस पर पिछले 14 दिनों में कोई नया ऑफ़र नहीं आया, वह अपने-आप हटा दी जाती है। आप उसे "My listings" से फिर लगा सकते हैं।',
          'इन शर्तों को तोड़ने वाली, या जिसे हम उचित रूप से असुरक्षित या ग़ैरक़ानूनी मानें, ऐसी किसी भी लिस्टिंग को हम बिना सूचना के हटा सकते हैं।',
        ],
      },
      {
        title: 'ऑफ़र और बिक्री',
        clauses: [
          'खरीदार किसी भी सक्रिय लिस्टिंग पर ऑफ़र दे सकते हैं। ऑफ़र निजी होते हैं: किसी लिस्टिंग के सभी ऑफ़र केवल उसका विक्रेता देखता है।',
          'ऑफ़र विक्रेता की माँगी कीमत का कम से कम 70% होना चाहिए। इससे कम ऑफ़र अपने-आप अस्वीकार हो जाते हैं।',
          'जब तक ऑफ़र विक्रेता के जवाब का इंतज़ार कर रहा है, खरीदार उसे ज़्यादा से ज़्यादा दो बार बदल सकता है (कुल तीन ऑफ़र)।',
          'विक्रेता कोई भी ऑफ़र स्वीकार कर सकता है, या कोई नहीं। सबसे ऊँचा ऑफ़र स्वीकार करना ज़रूरी नहीं है। ऑफ़र स्वीकार करने पर वस्तु बिकी हुई मानी जाती है। सौदा न हो पाने की स्थिति के लिए विक्रेता एक बैकअप खरीदार भी चुन सकता है।',
          'ऑफ़र देना या स्वीकार करना उसी कीमत पर सौदा पूरा करने की नेक-नीयत से कोशिश का वादा है। यह भुगतान नहीं है, और प्लेटफ़ॉर्म इसे लागू नहीं करवाता। बार-बार न आना, या ऑफ़र स्वीकार होने के बाद पीछे हटना, "No-show" के रूप में रिपोर्ट किया जा सकता है।',
          'आप अपनी ही लिस्टिंग पर ऑफ़र नहीं दे सकते, चाहे दूसरे खाते से या दोस्तों की मदद से, और कीमत बढ़ाने या दूसरे खरीदारों को हटाने के लिए नकली ऑफ़र नहीं दे सकते।',
          'सौदा तय होने के बाद, मिलते समय कोई भी पक्ष दूसरे की स्वतंत्र सहमति के बिना कीमत या शर्तें न बदले।',
        ],
      },
      {
        title: 'चैट और आचरण',
        clauses: [
          'सम्मान से पेश आएँ। उत्पीड़न, धमकी, नफ़रत भरी बातें, यौन सामग्री, पीछा करना, और अपमानजनक या भेदभावपूर्ण भाषा प्लेटफ़ॉर्म पर कहीं भी मना है।',
          'चैट का उपयोग केवल लिस्ट की गई वस्तु की बिक्री तय करने के लिए करें। इसमें विज्ञापन, स्पैम, प्रतिबंधित वस्तुएँ माँगना या पहले से भुगतान माँगना मना है।',
          {
            text: 'प्लेटफ़ॉर्म पर कहीं भी (लिस्टिंग, फ़ोटो, प्रोफ़ाइल, चैट, रिपोर्ट) आप ऐसा कुछ नहीं डाल सकते जो:',
            list: [
              'किसी और का है और जिसे साझा करने का आपको अधिकार नहीं, या किसी और का व्यक्तिगत डेटा है',
              'अश्लील, पोर्नोग्राफ़िक, बाल यौन शोषण से जुड़ा हो, या किसी की शारीरिक या अन्य निजता का उल्लंघन करता हो',
              'बच्चों के लिए हानिकारक हो',
              'किसी का उसके लिंग, धर्म, जाति, नस्ल या जातीयता के कारण अपमान या उत्पीड़न करता हो',
              'किसी पेटेंट, ट्रेडमार्क, कॉपीराइट या अन्य अधिकार का उल्लंघन करता हो',
              'जानबूझकर धोखा देता हो या भ्रमित करता हो, या साफ़ तौर पर झूठा हो',
              'किसी और व्यक्ति का रूप धारण करता हो',
              'भारत की एकता, अखंडता, रक्षा, सुरक्षा या संप्रभुता, दूसरे देशों से उसके संबंधों, या सार्वजनिक व्यवस्था के लिए ख़तरा हो, या किसी अपराध को बढ़ावा देता हो',
              'जिसमें कोई वायरस या ऐसा कोड हो जो किसी कंप्यूटर या प्लेटफ़ॉर्म को नुकसान पहुँचाने या दुरुपयोग के लिए हो',
              'भारत में लागू किसी कानून को तोड़ता हो',
            ],
          },
          'आपका फ़ोन नंबर और ईमेल दूसरे उपयोगकर्ताओं को कभी नहीं दिखाए जाते। संपर्क विवरण तभी साझा करें जब आप ख़ुद चाहें।',
          'प्लेटफ़ॉर्म की जाँच, रिपोर्टिंग या प्रतिबंधों से बचने की कोशिश न करें, जैसे प्रतिबंध के बाद नया खाता बनाना, या साइट से डेटा स्क्रैप करना, उस पर हमला करना या उसे ओवरलोड करना।',
        ],
      },
      {
        title: 'रिपोर्ट, चेतावनियाँ और प्रतिबंध',
        clauses: [
          'आप किसी उपयोगकर्ता या लिस्टिंग की रिपोर्ट इन कारणों से कर सकते हैं: No-show, उत्पीड़न (Harassment), नकली/प्रतिबंधित वस्तु (Fake/Prohibited item), या धोखाधड़ी (Scam)।',
          'हर रिपोर्ट की समीक्षा एक एडमिन करता है। रिपोर्ट तभी पक्की चेतावनी बनती है जब एडमिन उसे सही माने। बिना पुष्टि वाली रिपोर्ट किसी के ख़िलाफ़ नहीं गिनी जातीं।',
          'तीन (3) पक्की चेतावनियों वाला खाता अपने-आप प्रतिबंधित हो जाता है। प्रतिबंधित खाता लिस्टिंग नहीं बना सकता, ऑफ़र नहीं दे सकता, चैट, रेटिंग या रिपोर्ट नहीं कर सकता। अगर आपका किसी ऐसे व्यक्ति से सौदा चल रहा था जिस पर प्रतिबंध लग गया, तो {email} पर लिखें, हम जहाँ तक हो सके मदद करेंगे।',
          'गंभीर मामलों में, जैसे ग़ैरक़ानूनी गतिविधि, सुरक्षा को ख़तरा, धोखाधड़ी या झूठी पहचान, हम बिना पहले की चेतावनियों के तुरंत खाता निलंबित या प्रतिबंधित कर सकते हैं और उसकी लिस्टिंग हटा सकते हैं।',
          'चेतावनियाँ और प्रतिबंध आपके कॉलेज ईमेल के साथ रहते हैं। खाता हटाकर दोबारा साइन-अप करने से वे नहीं हटते।',
          'झूठी या दुर्भावनापूर्ण रिपोर्ट करना ख़ुद इन शर्तों का उल्लंघन है, और इससे आपके अपने खाते पर चेतावनी लग सकती है।',
          'अगर आपको लगता है कि कोई चेतावनी या प्रतिबंध ग़लत था, तो 14 दिनों के भीतर कारण बताते हुए {email} पर ईमेल करें। जहाँ संभव हो, मूल निर्णय न लेने वाला व्यक्ति इसकी समीक्षा करेगा, और हम 15 दिनों में उत्तर देंगे।',
          'जहाँ हमें लगे कि कोई ख़तरे में है या कोई अपराध हुआ है, वहाँ हम ज़रूरी जानकारी कॉलेज अधिकारियों या पुलिस के साथ साझा कर सकते हैं।',
        ],
      },
      {
        title: 'रेटिंग',
        clauses: [
          'बिक्री के बाद विक्रेता और स्वीकार किया गया खरीदार एक-दूसरे को एक बार, 1 से 5 स्टार तक रेटिंग दे सकते हैं। रेटिंग बाद में बदली नहीं जा सकती।',
          'रेटिंग ईमानदार और सौदे के बारे में होनी चाहिए। किसी चीज़ के बदले रेटिंग देना या माँगना, ख़राब रेटिंग की धमकी देना, या किसी की रेटिंग बढ़ाने या घटाने के लिए नकली सौदे करना मना है।',
          'इन नियमों को तोड़ने वाली रेटिंग हम हटा सकते हैं।',
        ],
      },
      {
        title: 'आपकी सामग्री',
        clauses: [
          'आपकी डाली फ़ोटो और लिखी बातें आपकी ही रहती हैं। प्लेटफ़ॉर्म चलाने के लिए, जब तक वे उस पर हैं, आप हमें उन्हें रखने, दिखाने और आकार बदलने का मुफ़्त, गैर-अनन्य लाइसेंस देते हैं।',
          'आप पुष्टि करते हैं कि आप जो डालते हैं उसे डालने का आपको अधिकार है, और वह किसी और के अधिकार या किसी कानून का उल्लंघन नहीं करता।',
        ],
      },
      {
        title: 'गोपनीयता और आपका डेटा',
        clauses: [
          {
            text: 'हम केवल वही डेटा लेते हैं जो प्लेटफ़ॉर्म चलाने के लिए ज़रूरी है:',
            list: [
              'आपका कॉलेज ईमेल, नाम, वर्ष, ब्रांच और वैकल्पिक प्रोफ़ाइल फ़ोटो',
              'आपकी लिस्टिंग, ऑफ़र, रेटिंग, रिपोर्ट और चैट संदेश',
              'आपको लॉग-इन रखने और साइट को सुरक्षित रखने के लिए ज़रूरी बुनियादी तकनीकी डेटा',
            ],
          },
          'आपका ईमेल दूसरे उपयोगकर्ताओं को कभी नहीं दिखाया जाता। आपका नाम, फ़ोटो, वर्ष, ब्रांच, रेटिंग और सक्रिय लिस्टिंग लॉग-इन किए हुए दूसरे छात्रों को दिखती हैं। फ़ोटो ऐसे वेब लिंक पर रखी जाती हैं जो गुप्त नहीं हैं, इसलिए जिसे किसी फ़ोटो का लिंक मिल जाए वह उसे खोल सकता है।',
          'चैट संदेश केवल बातचीत में शामिल दो लोग पढ़ सकते हैं। एडमिन रिपोर्ट की समीक्षा रिपोर्ट में दी गई जानकारी से करते हैं, और आपका कॉलेज ईमेल और आख़िरी लॉग-इन का समय जैसे खाते के विवरण देख सकते हैं। किसी बातचीत की रिपोर्ट करें तो ज़रूरी संदेश रिपोर्ट में शामिल करें।',
          'डेटा हमारे सेवा प्रदाताओं के पास रखा जाता है (वे कौन हैं, यह [[privacy]] में देखें)। हम आपका डेटा बेचते नहीं और विज्ञापन के लिए इस्तेमाल नहीं करते।',
          'आप सेटिंग्स से अपना डेटा देख, सुधार या हटा सकते हैं, या सेटिंग्स से या अपने कॉलेज ईमेल से {email} पर ईमेल करके अनुरोध भेज सकते हैं। हम 15 दिनों में उत्तर देते हैं। [[privacy]] आपके अधिकार पूरी तरह बताती है, और यह भी कि खाता हटाने के बाद हम क्या रखते हैं।',
        ],
      },
      {
        title: 'दायित्व की सीमा',
        clauses: [
          {
            text: 'कानून जितनी अनुमति देता है उस हद तक, प्लेटफ़ॉर्म, उसके संस्थापक और संचालक इनसे होने वाले किसी भी प्रत्यक्ष, अप्रत्यक्ष, आकस्मिक या परिणामी नुकसान के लिए उत्तरदायी नहीं हैं:',
            list: [
              'उपयोगकर्ताओं के बीच कोई भी सौदा या मुलाक़ात',
              'किसी वस्तु की हालत, वैधता, सुरक्षा या असलियत',
              'ऑफ़लाइन लेन-देन के दौरान होने वाली कोई भी बात',
              'प्लेटफ़ॉर्म के उपयोग से जुड़ा पैसे या संपत्ति का नुकसान, या व्यक्तिगत चोट',
              'प्लेटफ़ॉर्म का उपलब्ध न होना, धीमा होना, या डेटा खो जाना',
            ],
          },
          'प्लेटफ़ॉर्म "जैसा है" और "जैसा उपलब्ध है" के आधार पर दिया जाता है, बिना किसी वादे के कि वह त्रुटि-रहित या हमेशा उपलब्ध रहेगा।',
          'प्लेटफ़ॉर्म मुफ़्त है, इसलिए किसी भी दावे के लिए आपके प्रति हमारा कुल दायित्व ₹1,000 तक सीमित है, जहाँ तक कानून ऐसी सीमा की अनुमति देता है।',
          'इन शर्तों में कुछ भी आपके किसी ऐसे अधिकार को सीमित नहीं करता जिसे कानूनन सीमित नहीं किया जा सकता।',
        ],
      },
      {
        title: 'क्षतिपूर्ति',
        clauses: [
          'अगर प्लेटफ़ॉर्म का उपयोग करते हुए आप इन शर्तों या कानून को तोड़ते हैं, और उसकी वजह से कोई हम पर दावा करता है, तो उससे हमें होने वाली उचित लागत और नुकसान की भरपाई करने के लिए आप सहमत हैं।',
        ],
      },
      {
        title: 'खाते बंद करना',
        clauses: [
          'आप कभी भी प्लेटफ़ॉर्म का उपयोग बंद कर सकते हैं और सेटिंग्स में "Delete account" से ख़ुद अपना खाता हटा सकते हैं। न हो पाए तो {email} पर ईमेल करें।',
          'खाता हटाने पर आपकी चैट उन लोगों के लिए भी हट जाती है जिनसे आपने बात की थी। आपकी की गई रिपोर्ट आपके नाम के बिना बनी रहती हैं। जब तक आपके बारे में कोई रिपोर्ट समीक्षा का इंतज़ार कर रही है, आप खाता नहीं हटा सकते। हम क्या रखते हैं, यह [[privacy]] बताती है।',
          'इन शर्तों को तोड़ने वाले, धोखाधड़ी करने वाले, दूसरे उपयोगकर्ताओं को ख़तरे में डालने वाले, या अब नामांकित छात्र के न रहे खाते को हम निलंबित या बंद कर सकते हैं।',
          'दायित्व, क्षतिपूर्ति, लागू कानून वाले खंड, और जो कुछ भी अपने स्वभाव से जारी रहना चाहिए, वे खाता बंद होने के बाद भी लागू रहेंगे।',
        ],
      },
      {
        title: 'इन शर्तों में बदलाव',
        clauses: [
          'हम इन शर्तों को अपडेट कर सकते हैं। ऊपर की तारीख सबसे नया संस्करण दिखाती है। महत्वपूर्ण बदलावों पर, अगली बार प्लेटफ़ॉर्म इस्तेमाल करते समय हम आपसे दोबारा सहमति माँगेंगे।',
          'अगर आप अपडेट की गई शर्तों से सहमत नहीं हैं, तो प्लेटफ़ॉर्म का उपयोग बंद करें और सेटिंग्स में अपना खाता हटा दें।',
        ],
      },
      {
        title: 'लागू कानून और विवाद',
        clauses: [
          'ये शर्तें भारत के कानूनों के अधीन हैं।',
          'कृपया पहले {email} पर हमसे संपर्क करें ताकि हम किसी भी समस्या को आपसी बातचीत से सुलझाने की कोशिश कर सकें। अगर इससे बात न बने, तो देहरादून, उत्तराखंड की अदालतों का विशेष क्षेत्राधिकार होगा, किसी दूसरी अदालत या उपभोक्ता आयोग में जाने के आपके कानूनी अधिकार के अधीन।',
          'किसी सौदे को लेकर उपयोगकर्ताओं के बीच विवाद उन्हीं के बीच है। हम रिपोर्ट की समीक्षा करके मदद कर सकते हैं, पर उसे सुलझाना हमारे लिए ज़रूरी नहीं है।',
        ],
      },
      {
        title: 'सामान्य',
        clauses: [
          'अगर इन शर्तों का कोई भाग अमान्य पाया जाता है, तो बाकी लागू रहेगा।',
          'अगर हम किसी नियम को तुरंत लागू नहीं करते, तो इसका मतलब यह नहीं कि हमने बाद में उसे लागू करने का अधिकार छोड़ दिया।',
          'ये शर्तें, [[privacy]] और प्लेटफ़ॉर्म पर दिखाए गए कोई भी नियम मिलकर, प्लेटफ़ॉर्म के उपयोग के बारे में आपके और हमारे बीच का पूरा समझौता हैं।',
          'ये शर्तें अंग्रेज़ी और हिंदी में उपलब्ध हैं। दोनों में अंतर हो तो अंग्रेज़ी संस्करण लागू होगा।',
        ],
      },
      {
        title: 'संपर्क और शिकायतें',
        clauses: [
          'प्रश्न, शिकायत, अपील, डेटा अनुरोध, या ग़ैरक़ानूनी सामग्री की रिपोर्ट के लिए {email} पर ईमेल करें। सूचना प्रौद्योगिकी (मध्यवर्ती दिशानिर्देश और डिजिटल मीडिया आचार संहिता) नियम, 2021 के तहत यही हमारे शिकायत अधिकारी का संपर्क भी है। हमारे शिकायत अधिकारी हैं: {officer}।',
          'हम शिकायतों की प्राप्ति 24 घंटों में स्वीकार करते हैं और 15 दिनों में उनका समाधान करते हैं।',
          'खंड 5.3 तोड़ने वाली सामग्री की शिकायत पर हम 72 घंटों में कार्रवाई करते हैं। अगर कोई सामग्री किसी के निजी अंग, नग्नता या यौन क्रिया दिखाती है, या उसकी बदली हुई (मॉर्फ़्ड) तस्वीर है, और वह व्यक्ति (या उसकी ओर से कोई) शिकायत करता है, तो हम उसे 24 घंटों में हटा देते हैं।',
        ],
      },
    ],
  },
};
