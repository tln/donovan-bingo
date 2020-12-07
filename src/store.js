import {db} from './db';
import { writable, derived } from 'svelte/store';
import {sampleSize, cloneDeep} from "lodash";
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
let ALL_WORDS;
async function allWords() {
    console.log('allWords', ALL_WORDS)
    if (ALL_WORDS) return ALL_WORDS;
    let q = await db.collection('words').get();
    ALL_WORDS = q.docs.map(d => d.get('word'));
    console.log('->', ALL_WORDS);
    return ALL_WORDS;
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

// Are we fully loaded?
const userLoaded = writable(false);
const wordsLoaded = writable(false);
export const loaded = derived(
    [userLoaded, wordsLoaded],
    ([userLoaded, wordsLoaded]) => userLoaded && wordsLoaded
)

// Export stores for the users' word lists.
export const words = writable([]);

// Maintain a reference to the user document based on the
// username. Update the `words` and `done` whenever the user 
// is updated.
let userRef, unsub = () => {};
let wordsRef, unsubWords = () => {};
username.subscribe(
    async username => {
        unsub(); // Stop updates from previous subscription
        unsubWords();
        userLoaded.set(false);
        wordsLoaded.set(false);
        userRef = db.collection('users').doc(username);
        // Initalize the user, before we subscribe
        if (!(await userRef.get()).exists) {
            await initUser()
        }

        // Update words, done when user data changes
        unsub = userRef.onSnapshot(
            doc => {
                let data = doc.data() || {};
                words.set(data.words);
                userLoaded.set(true);
            }
        )

        // Update done when docs are added or removed
        wordsRef = userRef.collection('words');
        unsubWords = wordsRef.orderBy('index').onSnapshot(
            q => {
                words.set(q.docs.map(d=>d.data()))
                wordsLoaded.set(true);
            }
        )
    }
)
async function initUser() {
    await userRef.set({
        updated: firebase.firestore.Timestamp.now(),
        created: firebase.firestore.Timestamp.now(),
    });
    let index = 0;
    for (let word of await chooseWords()) {
        wordsRef.doc(word).set({
            word,
            index,
            done: null,  // will be set to a date
            image: null  // will be set to a URL
        });
        index++;
    }
    console.log('initted', userRef);
}

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

// Choose a random set of 24 words from WORDS.
async function chooseWords() {
    return sampleSize(await allWords(), 24);
}

// TODO for development only
export async function reset() {
    if (!userRef) return;
    userRef.delete();
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
                let index = r*5+c, word, bingo = false, done, image = null;
                switch(true) {
                    case index == BINGO_INDEX:
                        word = BINGO;
                        bingo = true;
                        done = true;
                        break;
                    case index > BINGO_INDEX:
                        index--;
                        // fallthrough
                    default:
                        ({word, done, image} = words[index]);
                }
                row.push({word, bingo, done, image, emoji: emojis[word]||''});
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