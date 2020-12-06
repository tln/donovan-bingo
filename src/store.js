import {db} from './db';
import { writable, derived } from 'svelte/store';
import {sampleSize, without} from "lodash";
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
]



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
// Should only be written within this module.
export const loaded = writable(false);

// Export stores for the users' words and done lists.
// Should only be written within this module.
export const words = writable([]);
export const done = writable([]);

// Maintain a reference to the user document based on the
// username. Update the `words` and `done` whenever the user 
// is updated.
let userRef, unsub = () => {};
username.subscribe(
    async username => {
        unsub(); // Stop updates from previous subscription
        loaded.set(false);
        userRef = db.collection('users').doc(username);
        // Initalze the user, before we subscribe
        if (!(await userRef.get()).exists) {
            await userRef.set({
                words: chooseWords(),
                done: [],
                updated: firebase.firestore.Timestamp.now(),
                created: firebase.firestore.Timestamp.now(),
            });
            console.log('initted', userRef);
        }

        // Update words, done when user data changes
        unsub = userRef.onSnapshot(
            doc => {
                // data will be undefned if we 
                let data = doc.data() || {};
                words.set(data.words);
                done.set(data.done);
                loaded.set(true);
            }
        )
    }
)

// Provide a way to mark a word as done.
let _done;
done.subscribe(value => _done = value);
export function toggle(word) {
    if (!_done.includes(word)) {
        userRef?.update({
            updated: firebase.firestore.Timestamp.now(),
            done: _done.concat(word)
        });
    } else {
        userRef?.update({
            updated: firebase.firestore.Timestamp.now(),
            done: without(_done, word)
        });
    }
}

// Choose a random set of 24 words from WORDS.
function chooseWords() {
    return sampleSize(WORDS, 24);
}

// TODO for development only
export function reset() {
    username.set('');
    userRef?.update({
        words: chooseWords(), 
        done: [], 
        claimedBingo: null
    });
}

export const BINGO = 'BINGO', BINGO_INDEX = 12;

// turn words for the current user into a grid
export const grid = derived(
    [words, done],
    ([words, doneWords]) => {
        console.log('grid!', words, doneWords);
        words = words || [];
        doneWords = doneWords || [];
        const grid = [];
        for (let r = 0; r < 5; r++) {
            const row = [];
            grid.push(row);
            for (let c = 0; c < 5; c++) {
                let index = r*5+c, word, bingo = false, done;
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
                        word = words[index];
                        done = doneWords.includes(word);
                }
                row.push({word, bingo, done});
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

export function claimBingo() {
    // TODO check if bingo is set?
    userRef?.update({
        updated: firebase.firestore.Timestamp.now(),
        claimedBingo: firebase.firestore.Timestamp.now()
    });
}
export const claimedBingo = writable(undefined);
db.collection('users')
  .where("claimedBingo", "!=", null)
  .orderBy("claimedBingo", "desc")
  .onSnapshot(
      q => claimedBingo.set(q.docs.map(doc => doc.id)[0])
  );