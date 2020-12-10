<script>
import {username, loaded, grid, setDone, setNotDone, hasBingo, reset, claimBingo, claimedBingo, setEmoji} from './store';
import {onMount} from 'svelte';

let name;
function start() {
	$username = name;
}

let currentCell, image;
function setCurrentDone() {
	setDone(currentCell.word, image);
	cancel();
}
function setCurrentNotDone() {
	setNotDone(currentCell.word);
	cancel();
}
function cancel() {
	image = null;
	currentCell = null;
}
async function uploadImage(event) {
	const file = event.target.files[0];
	const ref = firebase.storage().ref(file.name);
	await ref.put(file);
	image = await ref.getDownloadURL();
}
function updateEmoji() {
	console.log('updateEmoji');
	setEmoji(currentCell.word, prompt(`Emoji for ${currentCell.word}`, currentCell.emoji));
}
</script>

<svelte:body on:keypress="" class:gap={true}/>

<main>
	<nav>
		<span class="username" on:click={reset}>{$username}</span>
		<h1>Donovan Family Bingo</h1>
	</nav>
	{#if $claimedBingo}
		<div class="overlay">
			<div class="winner banner">
				<strong>{$claimedBingo}</strong> won!
			</div>
		</div>
	{:else if !$username}
		<div class="overlay">
			<div class="intro banner">
				<p>Laborum exercitation aute in proident ullamco minim est. Minim exercitation excepteur et amet pariatur do nulla officia occaecat. Quis voluptate do proident velit nulla. Mollit ea ipsum sunt ut exercitation tempor anim commodo dolor consequat duis esse aliqua ullamco. Aute incididunt ex ad aliqua officia dolore esse labore anim.</p>
				<p>xSit id ad exercitation nisi laborum consectetur est irure sint ipsum incididunt aute. Nisi veniam tempor id incididunt id dolore occaecat veniam aute enim. Dolore pariatur amet reprehenderit nulla pariatur tempor elit aliqua labore ex nulla.</p>
				<div>
					<input type="text" placeholder="Enter your name" bind:value={name}><button on:click={start}>Start</button>
				</div>

			</div>
		</div>
	{/if}
	{#if $loaded}
		<table>
			<tbody>
				{#each $grid as row, r}
					<tr>
						{#each row as cell, c}
							{#if cell.word === 'BINGO'}
								<td class="bingo-square" class:bingo={$hasBingo}>
									{#if $hasBingo}
										<button on:click={claimBingo}>BINGO</button>
									{:else}
										BINGO
									{/if}
								</td>
							{:else}
								<td on:click={() => currentCell = cell} 
									class:done={cell.done} 
									class:bingo={cell.bingo}
									style={`background-image: URL('${cell.image}')`}
									title="{cell.image}"
								><div class="emoji">{cell.emoji}</div>
								{cell.word}</td>
							{/if}
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
		{#if currentCell}
			<div class="overlay">
				<div class="cell-dialog banner">
					<h1 on:click={updateEmoji}>{currentCell.emoji}{currentCell.word}</h1>
					{#if currentCell.done}
						<div class="view-image" style={`background-image: URL('${currentCell.image}')`}/>
						<p>Made a mistake? Undo this square</p>
						<button on:click="{setCurrentNotDone}">Undo Square</button>
					{:else if !image}
						{#if currentCell.type == 'person'}
							<p>Have a conversation with <strong>{currentCell.word}</strong>, screenshot it and upload to claim this square. OR: upload a funny/embarrassing photo of <strong>{currentCell.word}</strong></p>
						{:else}
							<p>Take a picture with you and <strong>{currentCell.word}</strong> to claim this square.</p>
						{/if}
						<label class="upload-button" for="file">Upload</label>
						<input style="display: none;" id="file" type="file" on:change={uploadImage}>
					{:else}
						<div class="view-image" style={`background-image: URL('${image}')`}/>
						<p>Is this a good picture of you and <strong>{currentCell.word}</strong>?</p>
						<button on:click="{setCurrentDone}">Claim Square</button>
					{/if}
					<button class="cancel-button" on:click="{cancel}">Cancel</button>

				</div>
			</div>
		{/if}
	{/if}
</main>

<style>
main {
	--top: 40px;
}
nav {
	height: var(--top);
	line-height: var(--top);
	font-size: calc(var(--top) * .5);
}
nav h1 {
	padding: 0;
	margin: 0;
	line-height: inherit;
}
nav .username {
	float: right;

	/* float above overlay so we can reset */		
	position: relative;
	z-index: 2;
}
table {
	margin: 0 auto;
	padding: 0;
	border-collapse: collapse;
}
td {
	/* calculate size of cells usng vw/vh. Accomodate the nav
	   and 6 1px borders. */
	width: min(20vw, calc((100vh - var(--top) - 6px) / 5));
	height: min(20vw, calc((100vh - var(--top) - 6px) / 5));
	border: 1px solid black;
	margin: 0;
	padding: 0;
	text-shadow: 0px 0px 6px #adb;
	text-align: center;
	background-size: cover;
	background-repeat: no-repeat;
}
.emoji {
	font-size: min(5vw, 5vh);
}
.done {
	font-weight: bold;
}
.bingo {
	outline: 3px solid red;
}
.bingo-square {
	font-weight: bold;
	background: #d88;
}
/* Overlay obscures all of the content on the screen */
.overlay {
	position: absolute;
	display: block;
	z-index: 1;
	top: 0; left: 0; right: 0; bottom: 0;
	background: #00000088;
}

/* Banner is nested inside overlay and appears as a 
  ribbon across the middle of the screen */
.banner {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 100%;
	padding: 1em 0;
	background: white;
	box-sizing: border-box;
}
/* Large font, centered, with some color */
.winner {
	font-size: 10vw;
	text-align: center;
	color: blue;
}
/* Add some padding */
.intro {
	padding: 0 2em;
}

div.cell-dialog {
	width: 80%;
	max-width: 500px;
	padding: 1em;
}
div.cell-dialog h1 {
	padding: 0; 
	line-height: 1; 
	margin: 0;
}
div.cell-dialog p {
	margin: 1.5em 0;
}
div.cell-dialog button, div.cell-dialog .upload-button, .bingo button {
	position: relative;
	display: block;
	margin: 0;
	background: #adb;
	width: fit-content;
	padding: 1em;
	border: 2px outset currentColor;
	color: green;
	font-weight: bold;
}
.bingo button {
	display: inline;
}
div.cell-dialog button.cancel-button {
	position: absolute;
	right: 1em;
	bottom: 1em;

	background: #ddd;
	color: #888;
	font-weight: bold;
}
.view-image {
	background-size: cover;
	background-repeat: no-repeat;
	width: min(30vw, 30vh);
	height: min(30vw, 30vh);
	border: 1px solid black;
	margin: 1em 0;
}

</style>