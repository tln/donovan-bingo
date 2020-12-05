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
    "Special someone"
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
                done: []
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
        userRef?.update({done: _done.concat(word)});
    } else {
        userRef?.update({done: without(_done, word)});
    }
}




function chooseWords() {
    // choose a random set of 24 words from WORDS.
    return sampleSize(WORDS, 24);
}

// Has the user won
// Maybe set cell.winning = true?
export function won() {
    // TODO
}

export function resetWords() {
    userRef?.update({words: chooseWords(), done: []});
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
        return grid;
    }
)
