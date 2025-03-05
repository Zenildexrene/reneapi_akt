const axios = require('axios'); // Importer la bibliothèque axios pour faire des requêtes HTTP
const cheerio = require('cheerio'); // Importer cheerio pour le parsing HTML
const {decode} = require('html-entities'); // Importer la fonction decode pour décoder les entités HTML
const express = require('express'); // Importer express pour créer un serveur web
//const path = require('path'); // Importer le module path (commenté)
const app = express(); // Créer une instance d'application express
const port = 10000; // Définir le port du serveur

let isEmpty = (obj) => { // Fonction pour vérifier si un objet est vide
	for (var prop in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, prop)) return false; // Si l'objet a une propriété, il n'est pas vide
	}
	return true; // L'objet est vide
}

let removeObjIfNoProp = (obj) => { // Fonction pour supprimer les propriétés nulles, indéfinies ou vides d'un objet
	let keys = Object.keys(obj); // Obtenir les clés de l'objet
	let result = {}; // Créer un nouvel objet pour stocker les résultats
	for (let key of keys) {
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
	let year = currentDate.getFullYear(); 
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
		if (!e.response) {
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
		console.log("EMAIL: ", email, "\nCOOKIES: ", cookies); // Afficher l'email et les cookies dans la console
		let r1 = await axios.get('https://chatgate.ai/wp-login.php?redirect_to=https://chatgate.ai/'); // Faire une requête GET pour obtenir la page de connexion
		var html = cheerio.load(r1.data); // Charger le HTML avec cheerio
		var json = html('script[id="firebase-js-extra"]').text(); // Extraire le script contenant les informations Firebase
		let apiKey = JSON.parse(json.match(/\{(.*?)\}/g)[0]).apiKey; // Extraire la clé API de Firebase
		let r2 = await axios.post('https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode', { // Envoyer une requête pour envoyer un code de vérification par email
			'requestType': 'EMAIL_SIGNIN',
			'email': email,
			'continueUrl': 'https://chatgate.ai/login?redirect_to=https%3A%2F%2Fchatgate.ai%2F&ui_sd=0',
			'canHandleCodeInApp': true
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
			'email': email,
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
		let r7 = await axios.post('https://chatgate.ai/wp-json/firebase/v2/users/register-autologin', { // Faire une requête POST pour enregistrer l'utilisateur avec autologin
			'user': {
				'userId': r6.data.users[0].localId, // Utiliser l'ID de l'utilisateur
				'password': genChars(10), // Générer un mot de passe aléatoire
				'email': r6.data.users[0].email, // Utiliser l'email de l'utilisateur
				'providers': [
					r6.data.users[0].providerUser Info[0].providerId // Utiliser le provider de l'utilisateur
				]
			}
		}, {
			headers: {
				'auth-source': 'wordpress', // Définir la source d'authentification
				'cookie': fullCookie, // Ajouter le cookie complet
				'firebase-login-key': firebaseLoginKey, // Ajouter la clé de connexion Firebase
				'origin': 'https://chatgate.ai', // Définir l'origine
				'referer': 'https://chatgate.ai/login?redirect_to=https%3A%2F%2Fchatgate.ai%2F&lang=en', // Définir le référent
				'user-agent': 'Mozilla/5.0 (Linux; Android 8.1.0; vivo 1811) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.40 Mobile Safari/537.36', // Définir l'agent utilisateur
			}
		});
				let wp_login_cookie = r7.headers['set-cookie'][r7.headers['set-cookie'].length - 1].split(';')[0] + ';sbjs_session=pgs=1|||cpg=https://chatgate.ai/'; // Obtenir le cookie de connexion WordPress
		res.send({ // Envoyer la réponse avec le token de session
			session_token: btoa(fullCookie + wp_login_cookie) // Encoder le cookie complet et le cookie de connexion
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

app.listen(port, function () { // Démarrer le serveur sur le port spécifié
	console.log(`Le serveur écoute sur le port ${port}`); // Afficher un message dans la console
});

module.exports = app; // Exporter l'application pour l'utiliser dans d'autres fichiers