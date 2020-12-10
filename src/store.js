import {db} from './db';
import { writable, derived } from 'svelte/store';
import {sampleSize, shuffle} from "lodash";
if (false) {
    const WORDS = [
        "Christmas tree",
        "Christmas stocking",
        "Christmas decorations",
        "Beach",
        "Mountains",
        "Snow",
        "Present",
        "Drinks",
        "Christmas carols",
        "Christmas cards",
        "Family photo",
        "Pet",
        "Hat",
        "Toy",
        "Special someone",
        "Reindeer",
        "Santa",
        "Elves",
        "Coal",
        "Sleigh",
        "Eggnog",
        "Commercial Exploitation",
        "Ghosts of Christmas Past",
        "Regifting",
        "Festivus",
        "Mistletoe"
    ];
    let c = db.collection('words');
    for (let word of WORDS) c.doc(word).set({word}).then(() => console.log('added', word));
}

// Provide way to get the list of ALL_WORDS
async function allWords() {
    let q = await db.collection('words').get();
    return q.docs.map(d => ({type: 'word', word: d.get('word')}));
}
async function allUsers() {
    let q = await db.collection('users').get();
    return q.docs.map(d => ({word: d.id, type: 'person'}));
}

// Maintain a list of emojis and provide way to update
const emojis = writable({});
db.collection('words').onSnapshot(
    q => emojis.set(
        q.docs.reduce(
            (o, doc) => (o[doc.id] = doc.get('emoji'), o),
            {}
        )
    )
)
export function setEmoji(word, emoji) {
    db.collection('words').doc(word).update({emoji});
}

// A simple localstorage store
function localStore(key, defaultValue) {
    const value = localStorage.getItem(key) || defaultValue;
    const store = writable(value);
    store.subscribe(value => localStorage.setItem(key, value));
    return store;
}

// The username we should log in as
export const username = localStore('username', '');

// Embargo -- seconds until embargo date
const embargoDate = new Date('2020-12-12 4:00:00').valueOf();
export const embargo = writable(-1);
function secs() {
    return Math.floor(Date.now() / 1000);
}
setInterval(() => embargo.set(Math.max(0, embargoDate - secs()), 1000));
function countDownString(secs) {
    let parts = [];
    function calcPart(unit, divisor) {
        let n = secs % divisor;
        secs = Math.floor(secs / divisor);
        if (n) parts.unshift(n+' '+unit+(n > 1 ? 's' : ''));
    }
    calcPart('second', 60);
    calcPart('minute', 60);
    calcPart('hour', 24);
    calcPart('day', 1000);  // we won't need to do beyond days
    return parts.join(' ');
}
export const countDown = derived(embargo, countDownString);

// Export stores for the users' word lists.
export const words = writable([]);

// Maintain a reference to the user document based on the
// username. Update the `words` and `done` whenever the user 
// is updated.
let usernameString, userRef, wordsRef, unsub;
const userLoaded = writable(false);
const needWords = writable(true);
username.subscribe(
    async username => {
        if (unsub) unsub(); // Stop updates from previous subscription
        unsub = null;
        userLoaded.set(false);
        words.set([]);
        if (!username) return;
        usernameString = username;
        userRef = db.collection('users').doc(username);
        wordsRef = userRef.collection('words');

        // Initalize the user
        await initUser();
        userLoaded.set(true);
    }
)
async function initUser() {
    let userDoc = await userRef.get();
    if (userDoc.exists && userDoc.get('created')) {
        // already initted
        return;
    }
    await userRef.set({
        updated: firebase.firestore.Timestamp.now(),
        created: firebase.firestore.Timestamp.now(),
        wordsChosen: false,
    });
}
let initting = false;
async function initUserWords() {
    let userDoc = await userRef.get();
    console.log(initting, userDoc.exists, userDoc.data().wordsLoaded, unsub);
    if (initting || !userDoc.exists) return;
    initting = true;
    if (!userDoc.data().wordsLoaded) {
        console.log('loading words');
        let index = 0;
        const batch = db.batch();
        for (let {word, type} of await chooseWords()) {
            console.log('add word', word);
            batch.set(wordsRef.doc(word), {
                word,
                type,
                index,
                done: null,  // will be set to a date
                image: null  // will be set to a URL
            });
            index++;
        }
        batch.update(userRef, {wordsLoaded: true});
        await batch.commit();
    }
    if (!unsub) {
        console.log('subbing');
        // Update words store now, and when docs are added or removed
        unsub = wordsRef.orderBy('index').onSnapshot(
            q => words.set(q.docs.map(d=>d.data()))
        )
    }
    initting = false;
}

// Mark whether user is ready to play
export const loaded = derived(
    [userLoaded, embargo, words],
    ([userLoaded, embargo, words]) => {
        if (embargo || !userLoaded) return false;
        if (!words.length) initUserWords();
        return words.length > 0;
    }        
);

// Provide a way to mark a word as done.
export function setDone(word, image) {
    wordsRef.doc(word).update({
        done: firebase.firestore.Timestamp.now(),
        image
    });
}
export function setNotDone(word) {
    wordsRef.doc(word).update({
        done: null,
        image: null
    });
}

// Choose a random set of 24 words.
// Choose up to 8 users, and the rest from words.
async function chooseWords() {
    let users = (await allUsers()).filter(w => w.word != usernameString);
    let words = sampleSize(users, 8);
    console.log('chooseWords: words', words);
    return shuffle(words.concat(sampleSize(await allWords(), 24 - words.length)));
}

// TODO for development only
export async function reset() {
    if (!userRef) return;
    // userRef.delete();
    username.set('');
}

export const BINGO = 'BINGO', BINGO_INDEX = 12;

// turn words for the current user into a grid
export const grid = derived(
    [words, emojis],
    ([words, emojis]) => {
        if (!words || !words.length) return [];
        console.log('grid:', words);
        const grid = [];
        for (let r = 0; r < 5; r++) {
            const row = [];
            grid.push(row);
            for (let c = 0; c < 5; c++) {
                let index = r*5+c, word, bingo = false, done, image = null, type;
                switch(true) {
                    case index == BINGO_INDEX:
                        word = BINGO;
                        bingo = true;
                        done = true;
                        type = 'bingo'
                        break;
                    case index > BINGO_INDEX:
                        index--;
                        // fallthrough
                    default:
                        ({word, done, image, type} = words[index]);
                }
                row.push({word, bingo, done, image, type, emoji: emojis[word]||''});
            }
        }
        console.log('->', grid);
        setBingo(grid);

        return grid;
    }
)

// Update `bingo` status of cells, and as a side effect, update the
// hasBingo store
export const hasBingo = writable(false);
window.hasBingo = hasBingo; // TODO debugging
function setBingo(grid) {
    for (let cells of bingoCoords(grid)) {
        if (cells.every(c => c.done)) {
            hasBingo.set(true);
            cells.forEach(c => c.bingo = true)
            return
        }
    }
    hasBingo.set(false);
}
function *bingoCoords(grid) {
    const n = [0,1,2,3,4];
    yield n.map(i => grid[i][i]);     // Top-left to bottom-right
    yield n.map(i => grid[i][4-i]);   // Top-right to bottom left
    for (const i of n) {
        yield n.map(j => grid[i][j]); // row
        yield n.map(j => grid[j][i]); // column
    }
}

// Let user claim bingo. We don't verify the claim, it's up to UI to enforce it
export function claimBingo() {
    // TODO check if bingo is set?
    userRef?.update({
        updated: firebase.firestore.Timestamp.now(),
        claimedBingo: firebase.firestore.Timestamp.now()
    });
}

// Expose whether anyone has won
export const claimedBingo = writable(undefined);
db.collection('users')
  .where("claimedBingo", "!=", null)
  .orderBy("claimedBingo", "desc")
  .onSnapshot(
      q => claimedBingo.set(q.docs.map(doc => doc.id)[0])
  );