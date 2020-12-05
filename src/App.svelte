<script>
	export let cells = [
		['one', 'two', 'three', 'four', 'five'],
		['one', 'two', 'three', 'four', 'five'],
		['one', 'two', 'BINGO', 'four', 'five'],
		['one', 'two', 'three', 'four', 'five'],
		['one', 'two', 'three', 'four', 'five'],
	];
	export let done = {
		'1,1': true,
	};
	function isDone(r, c) {
		return ;
	}
	function markDone(r, c) {
		done[r+','+c] = true;
		done = done;
		console.log(done);
	}
</script>

<main>
	<table>
		<tbody>
			{#each cells as row, r}
				<tr>
					{#each row as cell, c}
						<td on:click={() => markDone(r,c)} class:done={done[r+','+c]} class:bingo={cell == 'BINGO'}>{cell}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</main>

<style>
table {
	margin: 0 auto;
	padding: 0;
	border-collapse: collapse;
}
td {
	width: min(20vw, 20vh);
	height: min(20vw, 20vh);
	border: 1px solid black;
	margin: 0;
	text-align: center;
}
td.bingo {
	background: #abd;
}
td.done {
	background: #bad;
}
</style>