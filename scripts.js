document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("fetch-matches").addEventListener("click", function() {
        fetchMatches();
    });

    async function fetchMatches() {
        const url = document.getElementById("url").value;
        const competitionId = document.getElementById("competitionId").value;
        const fromDate = document.getElementById("fromDate").value;
        const toDate = document.getElementById("toDate").value;
        const seasonYear = document.getElementById("seasonYear").value;
        const utcOffset = document.getElementById("utcOffset").value;
        const offset = document.getElementById("offset").value;
        const limit = document.getElementById("limit").value;

        const fullUrl = `${url}?competitionId=${competitionId}&fromDate=${fromDate}&toDate=${toDate}&seasonYear=${seasonYear}&utcOffset=${utcOffset}&offset=${offset}&limit=${limit}&order=ASC`;
        console.log(`Fetching data from: ${fullUrl}`);
        
        try {
            const response = await fetch(fullUrl);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const matchesData = await response.json();
            console.log(matchesData);
            displayMatches(matchesData);
        } catch (error) {
            console.error("Error fetching matches:", error);
            alert("Failed to fetch matches. Check the console for details.");
        }
    }

    function displayMatches(matchesData) {
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };

        const groupedByCompetition = groupBy(matchesData, match => match.competition?.metaData?.name || '');
        const container = document.getElementById("matches-container");
        container.innerHTML = '';

        Object.keys(groupedByCompetition).forEach(competitionName => {
            const competitionGroup = groupedByCompetition[competitionName];
            const competitionElement = document.createElement('div');
            competitionElement.classList.add('competition');
            competitionElement.innerHTML = `<h2>${competitionName}</h2>`;

            const groupedByGroup = groupBy(competitionGroup, match => match.group?.metaData?.groupName || '');
            Object.keys(groupedByGroup).forEach(groupName => {
                const groupGroup = groupedByGroup[groupName];
                const groupElement = document.createElement('div');
                groupElement.classList.add('group');
                groupElement.innerHTML = `<h3>${groupName}</h3>`;

                const groupedByRound = groupBy(groupGroup, match => match.round?.metaData?.name || '');
                Object.keys(groupedByRound).forEach(roundName => {
                    const roundGroup = groupedByRound[roundName];
                    const roundElement = document.createElement('div');
                    roundElement.classList.add('round');
                    roundElement.innerHTML = `<h4>${roundName}</h4>`;

                    const groupedByMatchday = groupBy(roundGroup, match => match.matchday?.longName || '');
                    Object.keys(groupedByMatchday).forEach(matchdayName => {
                        const matchdayGroup = groupedByMatchday[matchdayName];
                        const matchdayElement = document.createElement('div');
                        matchdayElement.classList.add('matchday');
                        matchdayElement.innerHTML = `
							<div class="accordion-header">
                            <h5 >${matchdayName} </h5>
							<sub	>(${new Date(matchdayGroup[0].matchday?.dateFrom).toLocaleString('en-US', options) || 'Unknown'} - ${new Date(matchdayGroup[0].matchday?.dateTo).toLocaleString('en-US', options) || 'Unknown'})</sub>
                           
							</div>
							<div class="accordion-content">
                                <div class="matchday-content"></div>
                            </div>
                        `;

                        const contentElement = matchdayElement.querySelector('.matchday-content');
                        const groupedByDay = groupBy(matchdayGroup, match => match.kickOffTime?.date || '');
                        Object.keys(groupedByDay).forEach(day => {
                            const dayGroup = groupedByDay[day];
                            const dayElement = document.createElement('div');
                            dayElement.classList.add('day-group');
                            dayElement.innerHTML = `<h6>${day}</h6>`;

                            dayGroup.forEach(match => {
                                const matchElement = document.createElement('div');
                                matchElement.classList.add('match', getMatchStatusClass(match));
                                matchElement.innerHTML = `
                                    <div class="match-details">
                                        <div class="team home-team">
                                            <img src="${match.homeTeam?.logoUrl || 'placeholder.png'}" alt="${match.homeTeam?.internationalName || 'Home Team'} Logo" class="team-logo">
                                            <span class="team-name">${match.homeTeam?.internationalName || 'Unknown Home Team'}</span>
                                        </div>
                                        <span class="vs">vs</span>
                                        <div class="team away-team">
                                            <img src="${match.awayTeam?.logoUrl || 'placeholder.png'}" alt="${match.awayTeam?.internationalName || 'Away Team'} Logo" class="team-logo">
                                            <span class="team-name">${match.awayTeam?.internationalName || 'Unknown Away Team'}</span>
                                        </div>
                                    </div>
                                    <div class="match-score">${getMatchScore(match)}</div>
                                    <div class="match-time">Kickoff: ${new Date(match.kickOffTime?.dateTime).toLocaleString('en-US', options) || 'Unknown'}
                                    <br>
                                     ${match.fullTimeAt != null ? 'Full Time: ' + new Date(match.fullTimeAt).toLocaleString('en-US', options) : ''}</div>
                                `;
                                // Add click event listener if match is finished
                                if (match.status === 'FINISHED') {
                                    matchElement.addEventListener('click', () => showMatchEvents(match));
                                }
                                dayElement.appendChild(matchElement);
                            });

                            contentElement.appendChild(dayElement);
                        });

                        // Add click event listener to toggle the accordion
                        const header = matchdayElement.querySelector('.accordion-header');
                        header.addEventListener('click', () => {
                            const content = matchdayElement.querySelector('.accordion-content');
                            content.style.display = content.style.display === 'block' ? 'none' : 'block';
                        });

                        roundElement.appendChild(matchdayElement);
                    });

                    groupElement.appendChild(roundElement);
                });

                competitionElement.appendChild(groupElement);
            });

            container.appendChild(competitionElement);
        });

        // Initialize all accordion contents to be closed by default
        document.querySelectorAll('.accordion-content').forEach(content => {
            content.style.display = 'none';
        });
    }

    function groupBy(array, keyFn) {
        return array.reduce((result, item) => {
            const key = keyFn(item);
            if (!result[key]) {
                result[key] = [];
            }
            result[key].push(item);
            return result;
        }, {});
    }

    function getMatchStatusClass(match) {
        const now = new Date();
        const matchTime = new Date(match.kickOffTime?.dateTime);
        const isLive = now >= matchTime && match.lineupStatus === 'AVAILABLE';
        if (match.status === 'FINISHED') {
            return 'match-finished';
        } else if (isLive) {
            return 'match-live';
        } else {
            return 'match-scheduled';
        }
    }

    function getMatchScore(match) {
        if (match.status === 'FINISHED') {
            const regularScore = match.score?.regular;
            return regularScore ? `${regularScore.home} - ${regularScore.away}` : 'Score not available';
        }
        return 'Not available';
    }

    function showMatchEvents(match) {
        const playerEvents = match.playerEvents || []; // Use the provided playerEvents object
        const popup = document.createElement('div');
        popup.classList.add('popup');
        
        // Function to get team name by team ID
        function getTeamNameById(teamId) {
            if (match.homeTeam && match.homeTeam.id === teamId) {
                return match.homeTeam.internationalName || 'Unknown Home Team';
            } else if (match.awayTeam && match.awayTeam.id === teamId) {
                return match.awayTeam.internationalName || 'Unknown Away Team';
            }
            return 'Unknown Team';
        }

        // Group scorers by team ID
        function groupScorersByTeam(scorers) {
            return scorers.reduce((result, scorer) => {
                const teamId = scorer.teamId;
                if (!result[teamId]) {
                    result[teamId] = {
                        teamName: getTeamNameById(teamId),
                        players: []
                    };
                }
                result[teamId].players.push(scorer);
                return result;
            }, {});
        }

        // Get grouped scorers
        const groupedScorers = groupScorersByTeam(playerEvents.scorers || []);

        popup.innerHTML = `
            <div class="popup-content">
                <button class="close-popup">Close</button>
                <h2>Match Events</h2>
                <div class="events-list">
                    <h3>Red Cards</h3>
                    ${Array.isArray(playerEvents.redCards) ? playerEvents.redCards.map(event => `
                        <div class="event">
                            <img src="${event.player.imageUrl || 'generic-head.svg'}" alt="${event.player.clubShirtName}" />
                            <p><strong>Player:</strong> ${event.player.clubShirtName}</p>
                            <p><strong>Team:</strong> ${getTeamNameById(event.teamId)}</p>
                            <p><strong>Time:</strong> ${event.time.minute}m ${event.time.second}s</p>
                        </div>
                    `).join('') : 'No red cards.'}
                    <h3>Scorers</h3>
                    ${Object.keys(groupedScorers).length > 0 ? Object.keys(groupedScorers).map(teamId => `
                        <div class="team-scorers">
                            <h4>${groupedScorers[teamId].teamName || 'Unknown Team'}</h4>
                            ${groupedScorers[teamId].players.map(scorer => `
                                <div class="event">
                                    <img src="${scorer.player.imageUrl || 'generic-head.svg'}" alt="${scorer.player.clubShirtName}" />
                                    <p><strong>Player:</strong> ${scorer.player.clubShirtName}</p>
                                    <p><strong>Time:</strong> ${scorer.time.minute}m ${scorer.time.second}s</p>
                                </div>
                            `).join('')}
                        </div>
                    `).join('') : 'No scorers.'}
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        // Add event listener to close the popup
        popup.querySelector('.close-popup').addEventListener('click', () => {
            document.body.removeChild(popup);
        });
    }
});
