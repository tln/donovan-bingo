<script>
import {username, loaded, grid, toggle, resetWords} from './store';
import {onMount} from 'svelte';

onMount(() => {
	if (!$username) $username = prompt('Who are you?');
})
</script>

<svelte:body class:gap={true}/>

<main>
	<nav>
		<button on:click={resetWords}>Reset</button>
		<button on:click={e => $username = prompt('Who are you?')}>{$username}</button> 
	</nav>
	{#if $loaded}
		<table>
			<tbody>
				{#each $grid as row, r}
					<tr>
						{#each row as cell, c}
							<td on:click={() => toggle(cell.word)} class:done={cell.done} class:bingo={cell.bingo}>{cell.word}</td>
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
	/* there are 6 1px borders */
	height: calc(var(--top));
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
td.bingo {
	background: #abd;
}
td.done {
	background: #bad;
}
</style>