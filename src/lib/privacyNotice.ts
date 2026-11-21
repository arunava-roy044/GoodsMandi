// The Privacy Notice, in English and Hindi, as data. The page is app/(main)/privacy/page.tsx.
//
// It follows section 5 of the Digital Personal Data Protection Act, 2023: what data and
// why, how to use your rights, and how to complain. Placeholders like {fiduciary},
// {officer}, {email} and {days} are filled in from src/lib/legal.ts.
//
// The Hindi text has not been checked by a native speaker or a lawyer yet. Have both
// look at it before launch.

export type NoticeSection = {
  title: string;
  paragraphs?: string[];
  list?: string[];
};

export type Notice = {
  title: string;
  updated: string; // "Last updated" label, followed by the date
  intro: string;
  reviewWarning: string;
  tocLabel: string;
  sections: NoticeSection[];
};

export const NOTICE: Record<'en' | 'hi', Notice> = {
  en: {
    title: 'Privacy Notice',
    updated: 'Last updated',
    intro:
      'This notice explains what personal data GoodsMandi collects, why, who sees it, how long we keep it, and how you can use your rights under the Digital Personal Data Protection Act, 2023. We wrote it in plain language. If something is unclear, write to us.',
    reviewWarning:
      'This notice was written by the GoodsMandi team and has not yet been reviewed by a lawyer.',
    tocLabel: 'Sections',
    sections: [
      {
        title: 'Who is responsible for your data',
        paragraphs: [
          'GoodsMandi is a marketplace for currently enrolled students of the college. The person or entity that decides why and how your personal data is used (the "Data Fiduciary" under the Act) is: {fiduciary}.',
          'Our Grievance Officer, who answers your questions and complaints about your data, is {officer}. Email: {email}.',
        ],
      },
      {
        title: 'What data we collect, and why',
        paragraphs: ['We collect only what we need to run the Platform.'],
        list: [
          'Account: your college email, your password (stored only in scrambled form by our login provider, so we cannot read it), your name, year of study and branch. We use it to create and protect your account, to check you are a student of the college, and to show other students who they are dealing with.',
          'Profile photo (optional): shown on your profile, listings and chats.',
          'Listings: titles, descriptions, prices and photos you post, so buyers can see what you are selling.',
          'Offers and ratings: so sellers can compare offers, and so students can build trust after a sale.',
          'Chat messages: so a buyer and a seller can arrange a meeting. Only the two people in a chat can read it.',
          'Reports and moderation records: reports you make or that are made about you, warnings, bans, and a log of what moderators did. We use these to keep the Platform safe.',
          'Notifications: a list of events that concern you, such as a new offer.',
          'Your consent: which version of this notice you agreed to, that you confirmed you are 18 or older, and when. We keep this so we can show what you agreed to.',
          'Technical data: login cookies that keep you signed in, and server logs (such as IP address and time of a request) that our hosting providers keep for security.',
        ],
      },
      {
        title: 'What we do not collect',
        paragraphs: [
          'We do not collect your phone number, your location, your contacts or any payment details. We do not sell your data, use it for advertising, or track or profile you. Your email is never shown to other students.',
        ],
      },
      {
        title: 'Why we may use your data',
        paragraphs: [
          'We use your data for the purposes above because you gave your consent when you signed up, and because you voluntarily gave us the data for those purposes. We may also use it where the law requires, for example to comply with a court order, or to help police or college authorities where someone is in danger or a crime has happened.',
        ],
      },
      {
        title: 'Who sees your data',
        list: [
          'Other students see your name, photo, year, branch, rating and active listings.',
          'Only the two people in a chat see its messages. Moderators can see messages only if someone includes them in a report.',
          'Moderators see reports and the content they need to review them.',
          'Companies that handle data for us (our "Data Processors"): Supabase (database, login and file storage), our website hosting provider (currently Vercel), and an email service that sends verification and password-reset emails. They may use your data only to provide their service to us, under their data-processing terms. If we change a provider, we update this notice.',
        ],
      },
      {
        title: 'Where your data is stored',
        paragraphs: [
          'Our database and photo storage are in Mumbai, India. Our website servers are also in India. Some providers may process limited technical data elsewhere, for example to send an email.',
        ],
      },
      {
        title: 'How long we keep your data',
        paragraphs: [
          'We keep your data while your account is open. When you delete your account, we erase your profile, photos, listings, offers, messages, ratings and notifications. We may keep records tied to an open report, a ban or a legal requirement for as long as needed. Copies in backups disappear when the backups expire.',
          'We do not keep data longer than needed for the purposes above. We are working out a rule for erasing accounts that stay unused for a long time, and we will update this notice before we apply it.',
        ],
      },
      {
        title: 'Your rights and how to use them',
        list: [
          'See your data: use "Download my data" in Settings, or send a request.',
          'Correct or update it: change your name, year, branch and photo in Settings.',
          'Erase it and withdraw your consent: use "Delete account" in Settings. This is as easy as signing up. If you withdraw, you can no longer use GoodsMandi, and we stop using your data except where the law lets us keep it. Anything done with your consent before you withdrew stays valid.',
          'Make a complaint: send a request marked "complaint". We reply within {days} days.',
          'Name someone to act for you if you die or cannot act for yourself: send a request marked "name someone".',
          'You can send any of these from your account (Settings, "Privacy request"), or by email to {email} from your college email.',
        ],
      },
      {
        title: 'If you are not happy with our answer',
        paragraphs: [
          'First write to us as above, so we can fix it. If you are still not satisfied, you can complain to the Data Protection Board of India once it starts receiving complaints.',
        ],
      },
      {
        title: 'Children',
        paragraphs: [
          'GoodsMandi is only for people who are 18 or older. We do not knowingly collect data from anyone under 18. If we find that an account belongs to someone under 18, we close it and erase its data.',
        ],
      },
      {
        title: 'Keeping your data safe',
        paragraphs: [
          'We use access rules so students can only see what they are meant to, encrypted connections, and records of what moderators do. If a data breach affects you, we will tell you and the Data Protection Board of India as the law requires.',
        ],
      },
      {
        title: 'Changes to this notice',
        paragraphs: [
          'If we change this notice in a way that matters, we will tell you and ask you to agree again. The date at the top shows the latest version.',
        ],
      },
    ],
  },
  hi: {
    title: 'गोपनीयता सूचना',
    updated: 'अंतिम बार अपडेट किया गया',
    intro:
      'यह सूचना बताती है कि GoodsMandi कौन-सा व्यक्तिगत डेटा लेता है, क्यों लेता है, उसे कौन देख सकता है, हम उसे कितने समय तक रखते हैं, और डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 के तहत आप अपने अधिकारों का उपयोग कैसे कर सकते हैं। इसे सरल भाषा में लिखा गया है। कुछ समझ न आए तो हमें लिखें।',
    reviewWarning:
      'यह सूचना GoodsMandi टीम ने लिखी है और अभी किसी वकील द्वारा जाँची नहीं गई है। हिंदी पाठ की भी अभी किसी हिंदी भाषी द्वारा समीक्षा नहीं हुई है।',
    tocLabel: 'खंड',
    sections: [
      {
        title: 'आपके डेटा की ज़िम्मेदारी किसकी है',
        paragraphs: [
          'GoodsMandi कॉलेज के वर्तमान में नामांकित छात्रों के लिए एक मार्केटप्लेस है। जो व्यक्ति या संस्था तय करती है कि आपका व्यक्तिगत डेटा क्यों और कैसे इस्तेमाल होगा (अधिनियम में "डेटा फिड्यूशियरी") वह है: {fiduciary}।',
          'आपके डेटा से जुड़े प्रश्नों और शिकायतों का उत्तर देने वाले हमारे शिकायत अधिकारी हैं: {officer}। ईमेल: {email}।',
        ],
      },
      {
        title: 'हम कौन-सा डेटा लेते हैं और क्यों',
        paragraphs: ['हम केवल वही डेटा लेते हैं जो प्लेटफ़ॉर्म चलाने के लिए ज़रूरी है।'],
        list: [
          'खाता: आपका कॉलेज ईमेल, आपका पासवर्ड (हमारे लॉगिन प्रदाता के पास केवल कूट रूप में रहता है, इसलिए हम उसे पढ़ नहीं सकते), आपका नाम, पढ़ाई का वर्ष और ब्रांच। इसका उपयोग आपका खाता बनाने और सुरक्षित रखने, यह जाँचने कि आप कॉलेज के छात्र हैं, और दूसरे छात्रों को यह दिखाने के लिए होता है कि वे किससे लेन-देन कर रहे हैं।',
          'प्रोफ़ाइल फ़ोटो (वैकल्पिक): आपकी प्रोफ़ाइल, लिस्टिंग और चैट में दिखती है।',
          'लिस्टिंग: आपके डाले गए शीर्षक, विवरण, कीमतें और फ़ोटो, ताकि खरीदार देख सकें कि आप क्या बेच रहे हैं।',
          'ऑफ़र और रेटिंग: ताकि विक्रेता ऑफ़र की तुलना कर सकें और बिक्री के बाद छात्रों में भरोसा बन सके।',
          'चैट संदेश: ताकि खरीदार और विक्रेता मिलने की व्यवस्था कर सकें। चैट केवल उन दो लोगों को दिखती है जो उसमें हैं।',
          'रिपोर्ट और मॉडरेशन रिकॉर्ड: आपकी की गई या आपके बारे में की गई रिपोर्ट, चेतावनियाँ, प्रतिबंध, और मॉडरेटरों के कामों का लॉग। इनका उपयोग प्लेटफ़ॉर्म को सुरक्षित रखने के लिए होता है।',
          'सूचनाएँ: आपसे जुड़ी घटनाओं की सूची, जैसे नया ऑफ़र।',
          'आपकी सहमति: आपने इस सूचना का कौन-सा संस्करण माना, आपने पुष्टि की कि आप 18 वर्ष या उससे अधिक के हैं, और कब। हम यह इसलिए रखते हैं कि दिखा सकें आपने किस पर सहमति दी थी।',
          'तकनीकी डेटा: आपको लॉग-इन रखने वाली कुकीज़, और सर्वर लॉग (जैसे IP पता और अनुरोध का समय) जो हमारे होस्टिंग प्रदाता सुरक्षा के लिए रखते हैं।',
        ],
      },
      {
        title: 'हम क्या नहीं लेते',
        paragraphs: [
          'हम आपका फ़ोन नंबर, लोकेशन, कॉन्टैक्ट या कोई भुगतान विवरण नहीं लेते। हम आपका डेटा बेचते नहीं, विज्ञापन के लिए इस्तेमाल नहीं करते, और आपको ट्रैक या प्रोफ़ाइल नहीं करते। आपका ईमेल दूसरे छात्रों को कभी नहीं दिखाया जाता।',
        ],
      },
      {
        title: 'हम आपका डेटा किस आधार पर इस्तेमाल कर सकते हैं',
        paragraphs: [
          'हम आपका डेटा ऊपर बताए उद्देश्यों के लिए इस्तेमाल करते हैं क्योंकि साइन-अप करते समय आपने सहमति दी, और आपने वह डेटा उन्हीं उद्देश्यों के लिए स्वेच्छा से दिया। कानून की ज़रूरत होने पर भी हम इसका उपयोग कर सकते हैं, जैसे अदालत के आदेश का पालन करने के लिए, या जब किसी की जान को ख़तरा हो या कोई अपराध हुआ हो तब पुलिस या कॉलेज अधिकारियों की मदद के लिए।',
        ],
      },
      {
        title: 'आपका डेटा कौन देखता है',
        list: [
          'दूसरे छात्र आपका नाम, फ़ोटो, वर्ष, ब्रांच, रेटिंग और सक्रिय लिस्टिंग देखते हैं।',
          'किसी चैट के संदेश केवल उसमें शामिल दो लोग देखते हैं। मॉडरेटर संदेश तभी देख सकते हैं जब कोई उन्हें रिपोर्ट में शामिल करे।',
          'मॉडरेटर रिपोर्ट और उसकी समीक्षा के लिए ज़रूरी सामग्री देखते हैं।',
          'हमारी ओर से डेटा संभालने वाली कंपनियाँ ("डेटा प्रोसेसर"): Supabase (डेटाबेस, लॉगिन और फ़ाइल स्टोरेज), हमारी वेबसाइट होस्टिंग प्रदाता (अभी Vercel), और एक ईमेल सेवा जो सत्यापन और पासवर्ड-रीसेट ईमेल भेजती है। वे आपका डेटा केवल हमें अपनी सेवा देने के लिए, अपनी डेटा-प्रोसेसिंग शर्तों के तहत इस्तेमाल कर सकती हैं। प्रदाता बदलने पर हम यह सूचना अपडेट करेंगे।',
        ],
      },
      {
        title: 'आपका डेटा कहाँ रखा जाता है',
        paragraphs: [
          'हमारा डेटाबेस और फ़ोटो स्टोरेज मुंबई, भारत में है। हमारे वेबसाइट सर्वर भी भारत में हैं। कुछ प्रदाता सीमित तकनीकी डेटा कहीं और प्रोसेस कर सकते हैं, जैसे ईमेल भेजते समय।',
        ],
      },
      {
        title: 'हम आपका डेटा कितने समय रखते हैं',
        paragraphs: [
          'जब तक आपका खाता खुला है हम आपका डेटा रखते हैं। खाता हटाने पर हम आपकी प्रोफ़ाइल, फ़ोटो, लिस्टिंग, ऑफ़र, संदेश, रेटिंग और सूचनाएँ मिटा देते हैं। किसी खुली रिपोर्ट, प्रतिबंध या कानूनी ज़रूरत से जुड़े रिकॉर्ड हम ज़रूरी अवधि तक रख सकते हैं। बैकअप में बची प्रतियाँ बैकअप की अवधि पूरी होने पर हट जाती हैं।',
          'हम डेटा को ऊपर के उद्देश्यों के लिए ज़रूरी समय से अधिक नहीं रखते। लंबे समय तक अप्रयुक्त खातों को मिटाने का एक नियम हम तैयार कर रहे हैं, और लागू करने से पहले यह सूचना अपडेट करेंगे।',
        ],
      },
      {
        title: 'आपके अधिकार और उनका उपयोग कैसे करें',
        list: [
          'अपना डेटा देखें: सेटिंग्स में "मेरा डेटा डाउनलोड करें" का उपयोग करें, या अनुरोध भेजें।',
          'सुधारें या अपडेट करें: सेटिंग्स में अपना नाम, वर्ष, ब्रांच और फ़ोटो बदलें।',
          'मिटाएँ और सहमति वापस लें: सेटिंग्स में "खाता हटाएँ" का उपयोग करें। यह उतना ही आसान है जितना साइन-अप करना। सहमति वापस लेने पर आप GoodsMandi का उपयोग नहीं कर पाएँगे, और जहाँ कानून हमें रखने देता है उसके अलावा हम आपका डेटा इस्तेमाल करना बंद कर देंगे। वापस लेने से पहले आपकी सहमति से जो हुआ वह वैध रहेगा।',
          'शिकायत करें: "शिकायत" चिह्नित अनुरोध भेजें। हम {days} दिनों में उत्तर देते हैं।',
          'अपनी मृत्यु या असमर्थता की स्थिति में किसी को अपनी ओर से कार्य करने के लिए नामित करें: "किसी को नामित करें" चिह्नित अनुरोध भेजें।',
          'इनमें से कुछ भी आप अपने खाते से (सेटिंग्स, "गोपनीयता अनुरोध") या अपने कॉलेज ईमेल से {email} पर ईमेल करके भेज सकते हैं।',
        ],
      },
      {
        title: 'हमारे उत्तर से संतुष्ट न हों तो',
        paragraphs: [
          'पहले ऊपर बताए अनुसार हमें लिखें ताकि हम इसे ठीक कर सकें। फिर भी संतुष्टि न मिले तो भारतीय डेटा संरक्षण बोर्ड के शिकायतें लेना शुरू करने पर आप उसमें शिकायत कर सकते हैं।',
        ],
      },
      {
        title: 'बच्चे',
        paragraphs: [
          'GoodsMandi केवल 18 वर्ष या उससे अधिक आयु के लोगों के लिए है। हम जानबूझकर 18 वर्ष से कम किसी का डेटा नहीं लेते। यदि पता चले कि कोई खाता 18 वर्ष से कम के व्यक्ति का है, तो हम उसे बंद कर उसका डेटा मिटा देते हैं।',
        ],
      },
      {
        title: 'आपके डेटा की सुरक्षा',
        paragraphs: [
          'हम एक्सेस नियम लगाते हैं ताकि छात्र केवल वही देख सकें जो उन्हें दिखना चाहिए, एन्क्रिप्टेड कनेक्शन इस्तेमाल करते हैं, और मॉडरेटरों के कामों का रिकॉर्ड रखते हैं। यदि किसी डेटा उल्लंघन से आप प्रभावित होते हैं, तो हम कानून के अनुसार आपको और भारतीय डेटा संरक्षण बोर्ड को सूचित करेंगे।',
        ],
      },
      {
        title: 'इस सूचना में बदलाव',
        paragraphs: [
          'यदि हम इस सूचना में कोई महत्वपूर्ण बदलाव करेंगे, तो आपको बताएँगे और दोबारा सहमति माँगेंगे। ऊपर की तारीख सबसे नया संस्करण दिखाती है।',
        ],
      },
    ],
  },
};
