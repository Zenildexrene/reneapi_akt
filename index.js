const axios = require('axios'); // Importer la bibliothèque axios pour effectuer des requêtes HTTP
const cheerio = require('cheerio'); // Importer cheerio pour analyser le HTML
const { decode } = require('html-entities'); // Importer la fonction decode pour décoder les entités HTML
const express = require('express'); // Importer express pour créer un serveur web
const path = require('path'); // Importer le module path pour gérer les chemins de fichiers
const app = express(); // Créer une instance de l'application express
const port = 3000; // Définir le port sur lequel le serveur écoutera

let isEmpty = (obj) => { // Fonction pour vérifier si un objet est vide
	for (var prop in obj) { // Parcourir les propriétés de l'objet
		if (Object.prototype.hasOwnProperty.call(obj, prop)) return false; // Si l'objet a une propriété, il n'est pas vide
	}
	return true; // L'objet est vide
}

let removeObjIfNoProp = (obj) => { // Fonction pour supprimer les propriétés nulles, indéfinies ou vides d'un objet
	let keys = Object.keys(obj); // Obtenir les clés de l'objet
	let result = {}; // Créer un nouvel objet pour stocker les résultats
	for (let key of keys) { // Parcourir les clés
		if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') result[key] = obj[key]; // Ajouter la propriété si elle n'est pas vide
	}
	return result; // Retourner l'objet filtré
}

let tempMail = async () => { // Fonction asynchrone pour générer un email temporaire
	try {
		let res = await axios.get('https://www.emailnator.com/'); // Faire une requête GET pour obtenir la page
		let cookies = res.headers['set-cookie'].map(r => r.split(';')[0]); // Extraire les cookies de la réponse
		let xsrf = cookies[0]; // Obtenir le premier cookie
		let res2 = await axios.post('https://www.emailnator.com/generate-email', { // Faire une requête POST pour générer un email
			'email': [
				//'plusGmail',
				//'dotGmail',
				'googleMail' // Spécifier le type d'email à générer
			]
		}, {
			headers: {
				'cookie': cookies.join(';'), // Ajouter les cookies à l'en-tête
				'x-xsrf-token': decodeURIComponent(xsrf.split('=')[1]) // Ajouter le token XSRF
			}
		});
		return { // Retourner l'email généré et les cookies
			email: res2.data.email[0],
			cookies: cookies
		};
	} catch (e) {
		throw e; // Lancer une erreur en cas d'échec
	}
}

let checkMail = async (email, cookies, messageId) => { // Fonction asynchrone pour vérifier les emails
	try {
		let params = removeObjIfNoProp({ // Filtrer les paramètres
			email: email,
			messageID: messageId
		});
		let xsrf = cookies[0]; // Obtenir le premier cookie
		let res = await axios.post('https://www.emailnator.com/message-list', params, { // Faire une requête POST pour obtenir la liste des messages
			headers: {
				'cookie': cookies.join(';'), // Ajouter les cookies à l'en-tête
				'x-xsrf-token': decodeURIComponent(xsrf.split('=')[1]) // Ajouter le token XSRF
			}
		});
		return res.data; // Retourner les données de la réponse
	} catch (e) {
		throw e; // Lancer une erreur en cas d'échec
	}
}

let getObjByKeyword = (el, bool, array) => { // Fonction pour obtenir des objets par mot-clé
	let similar = []; // Créer un tableau pour stocker les objets similaires
	array.filter(obj => { // Filtrer le tableau d'objets
		if (bool) {
			if (obj.mode.toLowerCase() === el.toLowerCase()) similar.push(obj); // Si bool est vrai, comparer le mode
		} else {	 
			if (obj.name.toLowerCase().includes(el.toLowerCase())) similar.push(obj); // Sinon, vérifier si le nom contient le mot-clé
		}
	});
	
	return similar; // Retourner les objets similaires
}

let getCurrentDateTime = () => { // Fonction pour obtenir la date et l'heure actuelles
	let currentDate = new Date(); // Créer un nouvel objet Date
	let year = currentDate.getFullYear(); // Obtenir l'année actuelle
	let month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Obtenir le mois actuel et le formater
	let day = String(currentDate.getDate()).padStart(2, '0'); // Obtenir le jour actuel et le formater
	let hours = String(currentDate.getHours()).padStart(2, '0'); // Obtenir l'heure actuelle et le formater
	let minutes = String(currentDate.getMinutes()).padStart(2, '0'); // Obtenir les minutes actuelles et les formater
	let seconds = String(currentDate.getSeconds()).padStart(2, '0'); // Obtenir les secondes actuelles et les formater
	let formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`; // Formater la date et l'heure
	return formattedDateTime; // Retourner la date et l'heure formatées
}

let findObject = (data, value) => { // Fonction pour trouver un objet dans les données par valeur
	let messageData = data.messageData; // Obtenir les données des messages
	for (let i = 0; i < messageData.length; i++) { // Parcourir les messages
		let message = messageData[i]; // Obtenir le message actuel
		if (message.from === value) { // Vérifier si l'expéditeur correspond à la valeur recherchée
			return message; // Retourner le message trouvé
		}
	}
	return null; // Retourner null si aucun message n'est trouvé
}

let genChars = (length) => { // Fonction pour générer des caractères aléatoires
	let randomChars = ''; // Initialiser une chaîne vide pour les caractères aléatoires
	const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'; // Définir les caractères possibles
	const charactersLength = characters.length; // Obtenir la longueur des caractères
	for (let i = 0; i < length; i++) { // Boucle pour générer des caractères
		const randomIndex = Math.floor(Math.random() * charactersLength); // Obtenir un index aléatoire
		randomChars += characters.charAt(randomIndex); // Ajouter le caractère aléatoire à la chaîne
	}
	return randomChars; // Retourner la chaîne de caractères aléatoires
}

app.get('/', (req, res) => { // Route pour la racine
    res.send("This API was made by HackMeSenpai."); // Envoyer une réponse
    // res.status(200); // Définir le statut de la réponse
})

app.get('/Chat', async function(req, res) { // Route pour le chat
    let msg = req.query.msg; // Obtenir le message de la requête
	let chatBot = req.query.chatBot; // Obtenir le nom du chatbot
	let mode = req.query.mode; // Obtenir le mode
	let cookie = req.query.token; // Obtenir le cookie de session
	let chatBotList = [{ // Liste des chatbots disponibles
			"name": "gpt-4",
			"mode": "chat",
			"botId": "chatbot-z3fedi"
		}, {
			"name": "Web Browsing",
			"mode": "chat",
			"botId": "chatbot-x0npa7"
		}, {
			"name": "gpt-4o",
			"mode": "chat",
			"botId": "chatbot-3siv3p"
		}, {
			"name": "gpt-4 vision",
			"mode": "Image",
			"botId": "chatbot-kvic0w"
		}, {
			"name": "dall.e 3",
			"mode": "Image",
			"botId": "chatbot-5rwkvr"
		}, {
			"name": "chat pdf",
			"mode": "pdf",
			"botId": "chatbot-naohv4"
		}, {
			"name": "gemini pro 1.5",
			"mode": "chat",
			"botId": "chatbot-qkxchq"
		}, {
			"name": "gemini pro vision",
			"mode": "Image",
			"botId": "chatbot-zn1po5"
		}, {
			"name": "palm 2 code chat",
			"mode": "chat",
			"botId": "default",			"customId": "8c9721b86593cb28fbdfd9496b4366c4"
		}, {
			"name": "claude 3 opus",
			"mode": "chat",
			"botId": "chatbot-zdmvyq"
		}, {
			"name": "claude 3 sonnet",
			"mode": "chat",
			"botId": "chatbot-iwyjrk"
		}, {
			"name": "claude 3 vision",
			"mode": "Image",
			"botId": "chatbot-12oenm"
		}, {
			"name": "sonar-8x7b-online",
			"mode": "chat",
			"botId": "default",
			"customId": "92fad6c4ad1e58a53fb61a84d29ed75f"
		}, {
			"name": "pplx-70b-online",
			"mode": "chat",
			"botId": "default",
			"customId": "cfd01ebd5d73ad22210a0a1eae32e11c"
		}, {
			"name": "llama 3 70b instruct",
			"mode": "chat",
			"botId": "default",
			"customId": "37732a3e6793260a1d6fb7aa201bcc4a"
		}, {
			"name": "llama 3 8b instruct",
			"mode": "chat",
			"botId": "default",
			"customId": "4218476a30bddce69ff07ea810018d77"
		}, {
			"name": "code llama 70b instruct",
			"mode": "chat",
			"botId": "default",
			"customId": "ddf0df7c99abae4aaada540fbb051eed"
		}, {
			"name": "fun gpt",
			"mode": "chat",
			"botId": "default",
			"customId": "c2061b0b83f5a9b5202d2d4d04649b65"
		}];

	if (typeof cookie === 'undefined') throw new Error('Requête invalide, aucun token de session fourni !'); // Vérifier si le cookie est défini
	if (typeof msg === 'undefined') throw new Error('Requête invalide, message vide !'); // Vérifier si le message est défini
	if (isEmpty(req.query) == true) { // Vérifier si la requête est vide
		req.query = { // Définir des valeurs par défaut
			// GPT-4 par défaut
			chatBot: 'gpt-4',
			botId: 'chatbot-x0npa7',
			customId: '',
			newMessage: msg // Ajouter le message à la requête
		};
	} else {
		let listByMode = getObjByKeyword(req.query.mode, true, chatBotList); // Obtenir les chatbots par mode
		let currentChatBot = getObjByKeyword(req.query.chatbotname, false, listByMode); // Obtenir le chatbot actuel
		if (currentChatBot.length > 1) req.query = currentChatBot[Math.floor(Math.random() * currentChatBot.length)]; // Choisir un chatbot aléatoire
		else if (currentChatBot.length < 1) { // Si aucun chatbot n'est trouvé
			console.log('[ INFO ] > Modèle non trouvé !'); // Log pour modèle non trouvé
			console.log('[ INFO ] > Utilisation du modèle par défaut (GPT-4)'); // Log pour utilisation du modèle par défaut
			req.query = { // Définir le modèle par défaut
				// GPT-4 par défaut
				botId: 'chatbot-x0npa7',
				fileId: req.query.fileId || null // Ajouter l'ID de fichier si disponible
			};
		} else {
			req.query = currentChatBot[0]; // Utiliser le chatbot trouvé
			req.query = Object.assign({ // Ajouter l'ID de fichier
				newFileId: req.query.fileId
			}, currentChatBot[0]);
		}
	}
	let params = removeObjIfNoProp({ // Filtrer les paramètres
		botId: req.query.botId,
		customId: req.query.customId,
		newMessage: msg,
		newFileId: req.query.fileId,
				stream: false // Indiquer que le streaming est désactivé
	});
	try {
		let { data: body } = await axios.get('https://chatgate.ai/', { // Faire une requête GET pour obtenir le corps de la réponse
			headers: {
				'cookie': atob(cookie), // Ajouter le cookie à l'en-tête
				'origin': 'https://chatgate.ai' // Définir l'origine
			}
		});
		let restNonce = decode(body).match(/"restNonce":"(.*?)"/g)[0].split(':')[1].replace(/"/g, ''); // Extraire le nonce de la réponse
		let r8 = await axios.post('https://chatgate.ai/wp-json/mwai-ui/v1/chats/submit', params, { // Faire une requête POST pour soumettre le message
			headers: {
				'cookie': atob(cookie), // Ajouter le cookie à l'en-tête
				'origin': 'https://chatgate.ai', // Définir l'origine
				'x-wp-nonce': restNonce // Ajouter le nonce
			}
		});
		res.send(r8.data); // Envoyer la réponse du serveur
	} catch (e) {
		if (!e.response) { // Vérifier si aucune réponse n'est reçue
			res.send({ // Envoyer une erreur si aucune réponse n'est reçue
				error: e.message
			});
		} else {
			res.send({ // Envoyer une erreur avec le statut et le message
				error: `${e.response.status} ${e.response.statusText}`,
				data: e.response.data.message
			});
		}
	}
});

app.get('/getToken', async function(req, res) { // Route pour obtenir un token
	try {
		let { email, cookies } = await tempMail(); // Générer un email temporaire
		let r1 = await axios.get('https://chatgate.ai/wp-login.php?redirect_to=https://chatgate.ai/'); // Faire une requête GET pour obtenir la page de connexion
		var html = cheerio.load(r1.data); // Charger le HTML avec cheerio
		var json = html('script[id="firebase-js-extra"]').text(); // Extraire le script contenant les informations Firebase
		let apiKey = JSON.parse(json.match(/\{(.*?)\}/g)[0]).apiKey; // Extraire la clé API de Firebase
		let r2 = await axios.post('https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode', { // Envoyer une requête pour envoyer un code de vérification par email
			'requestType': 'EMAIL_SIGNIN',
			'email': email,
			'continueUrl': 'https://chatgate.ai/login?redirect_to=https%3A%2F%2Fchatgate.ai%2F&ui_sd=0',
			'canHandleCodeInApp': true // Indiquer que l'application peut gérer le code dans l'application
		}, {
			params: {
				'key': apiKey // Ajouter la clé API dans les paramètres
			},
			headers: {
				'origin': 'https://chatgate.ai' // Définir l'origine
			}
		});
		while (true) { // Boucle pour vérifier les emails
			let tmail = await checkMail(email, cookies); // Vérifier les emails
			mailMsgs = findObject(tmail, 'noreply@auth.chatgate.ai'); // Trouver le message de l'expéditeur spécifié
			if (mailMsgs != null) break; // Sortir de la boucle si le message est trouvé
			await new Promise(resolve => setTimeout(resolve, 3000)); // Attendre 3 secondes avant de vérifier à nouveau
		}
		mailMsgs = await checkMail(email, cookies, mailMsgs.messageID); // Vérifier à nouveau le message trouvé
		let $ = cheerio.load(mailMsgs); // Charger le message avec cheerio
		let authUrl = $('a').attr('href'); // Extraire l'URL d'authentification
		let urlParts = new URLSearchParams(authUrl); // Analyser les paramètres de l'URL
		for (const [name, value] of urlParts) { // Parcourir les paramètres
			if (name == 'oobCode') oobCode = value; // Extraire le code oob
		}
		
				let r4 = await axios.get(`https://chatgate.ai/login?redirect_to=https://chatgate.ai/&ui_sd=0&apiKey=${apiKey}&oobCode=${oobCode}&mode=signIn&lang=en`, { // Faire une requête GET pour se connecter
			headers: {
				'origin': 'https://chatgate.ai' // Définir l'origine
			}
		});
		var html = cheerio.load(r4.data); // Charger la réponse avec cheerio
		var json = html('script[id="firebase-js-extra"]').text(); // Extraire le script contenant les informations Firebase
		let firebaseLoginKey = JSON.parse(json.match(/\{(.*?)\}/g)[3]).firebaseLoginKey; // Extraire la clé de connexion Firebase
		let datetime = getCurrentDateTime(); // Obtenir la date et l'heure actuelles
		let fullCookie = r4.headers['set-cookie'][0].split(';')[0] + `;sbjs_migrations=1418474375998=1;sbjs_current_add=fd=${datetime}|||ep=https://chatgate.ai/login?redirect_to=https://chatgate.ai/&ui_sd=0&apiKey=${apiKey}&oobCode=${oobCode}&mode=signIn&lang=en|||rf=https://auth.chatgate.ai/; sbjs_first_add=fd=${datetime}|||ep=https://chatgate.ai/login?redirect_to=https://chatgate.ai/&ui_sd=0&apiKey=${apiKey}&oobCode=${oobCode}&mode=signIn&lang=en|||rf=https://auth.chatgate.ai/; sbjs_current=typ=typein|||src=(direct)|||mdm=(none)|||cmp=(none)|||cnt=(none)|||trm=(none)|||id=(none); sbjs_first=typ=typein|||src=(direct)|||mdm=(none)|||cmp=(none)|||cnt=(none)|||trm=(none)|||id=(none); sbjs_udata=vst=1|||uip=(none)|||uag=Mozilla/5.0 (Linux; Android 8.1.0; vivo 1811) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.40 Mobile Safari/537.36; sbjs_session=pgs=1|||cpg=https://chatgate.ai/login?redirect_to=https://chatgate.ai/&ui_sd=0&apiKey=${apiKey}&oobCode=${oobCode}&mode=signIn&lang=en;`; // Construire le cookie complet
		let r5 = await axios.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithEmailLink', { // Faire une requête POST pour se connecter avec le lien d'email
			'email': email, // Ajouter l'email
			'oobCode': oobCode // Ajouter le code oob
		}, {
			params: {
				'key': apiKey // Ajouter la clé API dans les paramètres
			},
			headers: {
				'origin': 'https://chatgate.ai' // Définir l'origine
			}
		});
		let r6 = await axios.post('https://identitytoolkit.googleapis.com/v1/accounts:lookup', { // Faire une requête POST pour récupérer les informations de l'utilisateur
			'idToken': r5.data.idToken // Utiliser le token d'identification
		}, {
			params: {
				'key': apiKey // Ajouter la clé API dans les paramètres
			},
			headers: {
				'origin': 'https://chatgate.ai' // Définir l'origine
			}
		});
		res.send({ // Envoyer la réponse avec les données de l'utilisateur, le cookie complet et la clé de connexion Firebase
			data: r6.data,
			cookie: fullCookie,
			firebaseKey: firebaseLoginKey
		});
	} catch (e) {
		if (!e.response) // Vérifier si une réponse n'est pas reçue
			res.send({ // Envoyer une erreur si aucune réponse n'est reçue
				error: e.message
			});
		else {
			res.send({ // Envoyer une erreur avec le statut et le message
				error: `${e.response.status} ${e.response.statusText}`,
				data: e.response.data.message
			});
		}
	}
});

app.listen(port, () => { // Démarrer le serveur sur le port spécifié
  console.log(`Le serveur écoute sur le port ${port}`); // Afficher un message dans la console pour indiquer que le serveur est en cours d'exécution
});