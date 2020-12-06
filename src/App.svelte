<script>
import {username, loaded, grid, toggle, hasBingo, reset, claimBingo, claimedBingo} from './store';
import {onMount} from 'svelte';

let name;
function start() {
	$username = name;
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
				<p>Sit id ad exercitation nisi laborum consectetur est irure sint ipsum incididunt aute. Nisi veniam tempor id incididunt id dolore occaecat veniam aute enim. Dolore pariatur amet reprehenderit nulla pariatur tempor elit aliqua labore ex nulla.</p>
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
								<td class="bingo"><button on:click={claimBingo} disabled={!$hasBingo}>BINGO</button></td>
							{:else}
								<td on:click={() => toggle(cell.word)} class:done={cell.done} class:bingo={cell.bingo}>{cell.word}</td>
							{/if}
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
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
	text-align: center;
}
td button {
	display: block;
	width: 100%;
	height: 100%;
	margin: 0;
}
td.done {
	background: #bad;
}
td.bingo {
	background: #abd;
	color: red;
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
	padding: 1em 0;
	background: white;
	width: 100%;
    transform: translateY(-50%);
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
</style>