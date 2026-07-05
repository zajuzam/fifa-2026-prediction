
// =============================================================
// FUNCTIONS UNDER TEST (copied from FIFA2026_Prediction.html)
// =============================================================

var TEAM_CODES = {
  'Mexico':'mx','South Africa':'za','South Korea':'kr','Czechia':'cz',
  'Canada':'ca','Bosnia & Herz.':'ba','Qatar':'qa','Switzerland':'ch',
  'Brazil':'br','Morocco':'ma','Haiti':'ht','Scotland':'gb-sct',
  'United States':'us','Paraguay':'py','Australia':'au','Turkiye':'tr',
  'Germany':'de','Curacao':'cw','Ivory Coast':'ci','Ecuador':'ec',
  'Netherlands':'nl','Japan':'jp','Sweden':'se','Tunisia':'tn',
  'Belgium':'be','Egypt':'eg','Iran':'ir','New Zealand':'nz',
  'Spain':'es','Cape Verde':'cv','Saudi Arabia':'sa','Uruguay':'uy',
  'France':'fr','Senegal':'sn','Iraq':'iq','Norway':'no',
  'Argentina':'ar','Algeria':'dz','Austria':'at','Jordan':'jo',
  'Portugal':'pt','DR Congo':'cd','Uzbekistan':'uz','Colombia':'co',
  'England':'gb-eng','Croatia':'hr','Ghana':'gh','Panama':'pa','TBD':'un',
  // --- Session additions: aliases for R32 match display names ---
  'USA':'us','Bosnia & Herzegovina':'ba'
};

function teamFlagImg(name) {
  var code = TEAM_CODES[name];
  if (!code) return '';
  return '<img src="https://flagcdn.com/32x24/' + code + '.png" alt="' + name + '" class="dm-flag">';
}

function countryToFlag(country) {
  if (!country) return '';
  var m = {
    'Afghanistan':'af','Albania':'al','Algeria':'dz','Angola':'ao','Argentina':'ar',
    'Armenia':'am','Australia':'au','Austria':'at','Azerbaijan':'az','Bahrain':'bh',
    'Bangladesh':'bd','Belgium':'be','Bolivia':'bo','Bosnia and Herzegovina':'ba',
    'Bosnia & Herz.':'ba','Brazil':'br','Bulgaria':'bg','Cameroon':'cm','Canada':'ca',
    'Chile':'cl','China':'cn','Colombia':'co','Costa Rica':'cr','Croatia':'hr',
    'Czechia':'cz','Czech Republic':'cz','Denmark':'dk','Ecuador':'ec','Egypt':'eg',
    'Finland':'fi','France':'fr','Germany':'de','Ghana':'gh','Greece':'gr',
    'Honduras':'hn','Hungary':'hu','India':'in','Indonesia':'id','Iran':'ir',
    'Iraq':'iq','Ireland':'ie','Israel':'il','Italy':'it','Jamaica':'jm','Japan':'jp',
    'Jordan':'jo','Kazakhstan':'kz','Kenya':'ke','Kuwait':'kw','Latvia':'lv',
    'Lebanon':'lb','Malaysia':'my','Mexico':'mx','Morocco':'ma','Netherlands':'nl',
    'New Zealand':'nz','Nigeria':'ng','Norway':'no','Oman':'om','Pakistan':'pk',
    'Panama':'pa','Paraguay':'py','Peru':'pe','Philippines':'ph','Poland':'pl',
    'Portugal':'pt','Qatar':'qa','Romania':'ro','Russia':'ru','Saudi Arabia':'sa',
    'Senegal':'sn','Serbia':'rs','Singapore':'sg','Slovakia':'sk','Slovenia':'si',
    'South Africa':'za','South Korea':'kr','Spain':'es','Sri Lanka':'lk','Sweden':'se',
    'Switzerland':'ch','Taiwan':'tw','Thailand':'th','Tunisia':'tn','Turkey':'tr',
    'Turkiye':'tr','Ukraine':'ua','United Arab Emirates':'ae','UAE':'ae',
    'United Kingdom':'gb','UK':'gb','England':'gb','Scotland':'gb','Wales':'gb',
    'United States':'us','USA':'us','Uruguay':'uy','Uzbekistan':'uz',
    'Venezuela':'ve','Vietnam':'vn','Yemen':'ye','Zimbabwe':'zw'
  };
  var t = country.trim();
  var code = t.length === 2 ? t.toLowerCase() : m[t];
  if (!code) return '';
  return '<img src="https://flagcdn.com/20x15/' + code + '.png" alt="' + t + '" title="' + t + '" style="vertical-align:middle;margin-right:5px;border-radius:2px">';
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric', weekday:'short'});
}

function calcPoints(ps1, ps2, as1, as2) {
  ps1=parseInt(ps1); ps2=parseInt(ps2); as1=parseInt(as1); as2=parseInt(as2);
  if (isNaN(ps1)||isNaN(ps2)||isNaN(as1)||isNaN(as2)) return 0;
  if (ps1===as1 && ps2===as2) return 3;
  return Math.sign(ps1-ps2) === Math.sign(as1-as2) ? 1 : 0;
}

function isMatchLocked(date, time) {
  var mx = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!mx) return false;
  var h = parseInt(mx[1]), min = parseInt(mx[2]);
  if (mx[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (mx[3].toUpperCase() === 'AM' && h === 12) h = 0;
  var kickoff = new Date(date + 'T' + String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0') + ':00-04:00');
  return Date.now() >= kickoff.getTime();
}

// App globals
var VENUE_INFO = {
  'Estadio Azteca': {stadium:'Estadio Azteca', city:'Mexico City', state:'', map:'https://maps.google.com/?q=Azteca'},
  'MetLife Stadium': {stadium:'MetLife Stadium', city:'East Rutherford', state:'NJ', map:'https://maps.google.com/?q=MetLife'}
};
var FLAGS = {'Argentina':'AR','France':'FR','Brazil':'BR','TBD':'?'};
var matches=[], actualScores={}, predictions={}, knockoutTeams={};
var currentUser='', pinVerified=false, predDateFilter='';

function getTeam(m, side) {
  var ko = knockoutTeams[m.id];
  if (ko && ko[side] && ko[side] !== 'TBD') return ko[side];
  return m[side];
}

function renderTodayMatches() {
  var container = document.getElementById('todayMatchesContainer');
  var now = new Date();
  var todayStr = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  var parseET = function(t) {
    var x = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!x) return 0;
    var h=parseInt(x[1]), mn=parseInt(x[2]);
    if (x[3].toUpperCase()==='PM' && h!==12) h+=12;
    if (x[3].toUpperCase()==='AM' && h===12) h=0;
    return h*60+mn;
  };
  var todayMatches = matches.filter(function(m){ return m.date===todayStr; })
    .sort(function(a,b){ return parseET(a.time)-parseET(b.time); });
  if (!todayMatches.length) {
    container.innerHTML='<div class="no-matches-today"><div class="big-icon">X</div><h3>No matches today</h3></div>';
    return;
  }
  var dateObj = new Date(todayStr+'T12:00:00');
  var dayName = dateObj.toLocaleDateString('en-US',{weekday:'long'}).toUpperCase();
  var monthDay = dateObj.toLocaleDateString('en-US',{month:'numeric',day:'numeric'});
  var rows = '';
  todayMatches.forEach(function(m) {
    var vi = VENUE_INFO[m.venue] || {stadium:m.venue, city:'', state:''};
    var sc = actualScores[m.id], hasScore = sc!==undefined;
    var grpLabel = m.group!=='-' ? 'GROUP '+m.group : m.stage.toUpperCase();
    var mapLink = vi.map ? ' - <a href="'+vi.map+'" target="_blank" rel="noopener">Map</a>' : '';
    rows +=
      '<div class="dark-match-row">'+
        '<div class="dm-time">'+m.time+' ET</div>'+
        '<div class="dm-team">'+teamFlagImg(m.team1)+'<span>'+m.team1+'</span></div>'+
        (hasScore ? '<div class="dm-score">'+sc.s1+' - '+sc.s2+'</div>' : '<div class="dm-vs">VS</div>')+
        '<div class="dm-team right"><span>'+m.team2+'</span>'+teamFlagImg(m.team2)+'</div>'+
      '</div>'+
      '<div class="dm-meta">'+
        '<span class="dm-group">'+grpLabel+'</span>'+
        '<span class="dm-venue">'+vi.stadium+(vi.city?' - '+vi.city+(vi.state?', '+vi.state:''):'')+mapLink+'</span>'+
      '</div>';
  });
  container.innerHTML = '<div class="dark-schedule"><div class="dark-date-hdr">'+dayName+' '+monthDay+'</div><div class="dark-matches-card">'+rows+'</div></div>';
}

function predStageMatch(m, predStage) {
  if (predStage === 'Group Stage') return m.stage === 'Group Stage';
  if (predStage === 'Final') return m.stage === 'Final' || m.stage === 'Bronze Medal';
  return m.stage === predStage;
}

function renderPredDateButtons() {
  var predStage = document.getElementById('predStageFilter').value;
  var isKO = predStage !== 'Group Stage';
  var row = document.getElementById('predDateRow');
  row.style.display = 'flex';
  var now = new Date();
  var ts = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  var R32_CUTOFF = '2026-07-03';
  var allKODates = Array.from(new Set(matches.filter(function(m){ return predStageMatch(m, predStage); }).map(function(m){ return m.date; }))).sort();
  var dates = isKO ? allKODates.filter(function(d) {
    if (d <= R32_CUTOFF) return true;
    return matches.filter(function(m){ return m.date===d && predStageMatch(m, predStage); }).some(function(m){ return getTeam(m,'team1')!=='TBD' && getTeam(m,'team2')!=='TBD'; });
  }) : allKODates;
  var b = '<button onclick="setPredDate(\'\');" style="background:'+(predDateFilter===''?'var(--navy)':'#fff')+';color:'+(predDateFilter===''?'#fff':'var(--navy)')+'">All</button>';
  dates.forEach(function(d) {
    var sel = predDateFilter===d, isT = d===ts;
    var lbl = new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
    b += '<button onclick="setPredDate(\''+d+'\');" style="border:2px solid '+(isT?'var(--gold)':'var(--border)')+';background:'+(sel?'var(--navy)':'#fff')+';color:'+(sel?'#fff':'var(--navy)')+';">'+(isT?'zap ':'')+lbl+'</button>';
  });
  document.getElementById('predDateBtns').innerHTML = b;
}
function setPredDate(d) { predDateFilter=d; renderPredDateButtons(); }

function renderPredictions() {
  renderPredDateButtons();
  var container = document.getElementById('predictContainer');
  if (!pinVerified) {
    container.innerHTML = '<div>PIN required</div>';
    return;
  }
  var predStage = document.getElementById('predStageFilter').value;
  var grp = document.getElementById('predGroupFilter').value;
  var onlyUnpred = document.getElementById('showUnpredicted').checked;
  var isKnockout = predStage !== 'Group Stage';
  document.getElementById('predGroupFilter').style.display = isKnockout ? 'none' : '';
  var userPreds = predictions[currentUser] || {};
  var list = matches.filter(function(m) {
    if (isKnockout) {
      if (!predStageMatch(m, predStage)) return false;
      if (predDateFilter && m.date !== predDateFilter) return false;
      if (onlyUnpred && userPreds[m.id]) return false;
      return true;
    }
    if (m.stage !== 'Group Stage') return false;
    if (grp && m.group !== grp) return false;
    if (predDateFilter && m.date !== predDateFilter) return false;
    if (onlyUnpred && userPreds[m.id]) return false;
    return true;
  });
  if (isKnockout) {
    var anyTeamSet = list.some(function(m){ return getTeam(m,'team1')!=='TBD' || getTeam(m,'team2')!=='TBD'; });
    if (!anyTeamSet) {
      container.innerHTML = '<div class="alert alert-warn">'+predStage+' predictions will be available once the Admin sets the team matchups.</div>';
      return;
    }
  }
  // Sort by date then by kick-off time (EST)
  var parseETp = function(t) {
    var x = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!x) return 0;
    var h=parseInt(x[1]), mn=parseInt(x[2]);
    if (x[3].toUpperCase()==='PM' && h!==12) h+=12;
    if (x[3].toUpperCase()==='AM' && h===12) h=0;
    return h*60+mn;
  };
  list.sort(function(a,b){ return a.date.localeCompare(b.date) || parseETp(a.time)-parseETp(b.time); });
  var html = '<div class="pred-dark-wrap"><div class="pred-dark-card">';
  var lastGrp = '';
  list.forEach(function(m) {
    var t1 = getTeam(m,'team1'), t2 = getTeam(m,'team2');
    if (isKnockout && m.stage!==lastGrp) { html+='<div class="pred-dark-grp-hdr">'+m.stage+'</div>'; lastGrp=m.stage; }
    var sc = actualScores[m.id], pred = userPreds[m.id] || {};
    var isLocked = (function(date, time) {
      var mx = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!mx) return false;
      var h=parseInt(mx[1]), min=parseInt(mx[2]);
      if (mx[3].toUpperCase()==='PM' && h!==12) h+=12;
      if (mx[3].toUpperCase()==='AM' && h===12) h=0;
      var kickoff = new Date(date+'T'+String(h).padStart(2,'0')+':'+String(min).padStart(2,'0')+':00-04:00');
      return Date.now() >= kickoff.getTime();
    })(m.date, m.time);
    var ptsBadge = '';
    if (sc!==undefined && pred.s1!==undefined) {
      var pts = calcPoints(pred.s1,pred.s2,sc.s1,sc.s2);
      ptsBadge = pts===3 ? '<span class="score-badge score-exact">+3 pts</span>'
                : pts===1 ? '<span class="score-badge score-result">+1 pt</span>'
                :            '<span class="score-badge score-wrong">0 pts</span>';
    }
    var grpLabel = m.group!=='-' ? '<span style="color:#D4AF37;font-weight:700">Group '+m.group+'</span>' : '';
    html +=
      '<div class="pred-dark-row">'+
        '<div class="pred-dark-team">'+teamFlagImg(t1)+'<span>'+t1+'</span></div>'+
        '<div class="pred-dark-center"><div class="pred-dark-inputs">'+
          '<input type="number" id="pred_'+m.id+'_s1" value="'+(pred.s1!==undefined?pred.s1:'')+'" data-mid="'+m.id+'" data-side="s1"'+(isLocked?' disabled':'')+'>'+
          '<span class="dash">:</span>'+
          '<input type="number" id="pred_'+m.id+'_s2" value="'+(pred.s2!==undefined?pred.s2:'')+'" data-mid="'+m.id+'" data-side="s2"'+(isLocked?' disabled':'')+'>'+
        '</div></div>'+
        '<div class="pred-dark-team right"><span>'+t2+'</span>'+teamFlagImg(t2)+'</div>'+
      '</div>'+
      '<div class="dm-meta"><span class="pred-dark-info">'+fmtDate(m.date)+' - '+m.time+
        (m.group!=='-' ? ' - '+grpLabel : '')+
        (sc!==undefined ? ' - <span class="pred-dark-actual">Actual: '+sc.s1+'-'+sc.s2+'</span>' : '')+
        (isLocked ? ' <span class="pred-dark-lock">Locked</span>' : '')+
      '</span><span>'+ptsBadge+'</span></div>';
  });
  container.innerHTML = list.length ? html+'</div></div>' : '<p>All predictions submitted!</p>';
}

// =============================================================
// MINI TEST RUNNER
// =============================================================
var suites=[], currentSuite=null;

function describe(name, fn) { currentSuite={name:name,tests:[]}; suites.push(currentSuite); fn(); }
function it(name, fn) {
  try { fn(); currentSuite.tests.push({name:name,pass:true}); }
  catch(e) { currentSuite.tests.push({name:name,pass:false,err:e.message}); }
}
function expect(val) {
  return {
    toBe: function(exp){ if(val!==exp) throw new Error('Expected '+JSON.stringify(exp)+', got '+JSON.stringify(val)); },
    toContain: function(s){ if(!String(val).includes(s)) throw new Error('Expected to contain '+JSON.stringify(s)+'\nIn: '+String(val).slice(0,200)); },
    notToContain: function(s){ if(String(val).includes(s)) throw new Error('Expected NOT to contain '+JSON.stringify(s)); },
    toBeTrue: function(){ if(val!==true) throw new Error('Expected true, got '+JSON.stringify(val)); },
    toBeFalse: function(){ if(val!==false) throw new Error('Expected false, got '+JSON.stringify(val)); }
  };
}

function resetState() {
  matches=[]; actualScores={}; predictions={}; knockoutTeams={};
  currentUser=''; pinVerified=false; predDateFilter='';
  document.getElementById('predStageFilter').value='Group Stage';
  document.getElementById('predGroupFilter').value='';
  document.getElementById('showUnpredicted').checked=false;
  document.getElementById('predDateRow').style.display='flex';
}

// =============================================================
// TEST SUITES
// =============================================================

// 1. TEAM_CODES
describe('TEAM_CODES - all 48 World Cup 2026 teams mapped', function() {
  var expected=['Mexico','South Africa','South Korea','Czechia','Canada','Bosnia & Herz.','Qatar','Switzerland','Brazil','Morocco','Haiti','Scotland','United States','Paraguay','Australia','Turkiye','Germany','Curacao','Ivory Coast','Ecuador','Netherlands','Japan','Sweden','Tunisia','Belgium','Egypt','Iran','New Zealand','Spain','Cape Verde','Saudi Arabia','Uruguay','France','Senegal','Iraq','Norway','Argentina','Algeria','Austria','Jordan','Portugal','DR Congo','Uzbekistan','Colombia','England','Croatia','Ghana','Panama'];
  it('has 51 entries (48 teams + TBD + USA alias + Bosnia & Herzegovina alias)', function(){ expect(Object.keys(TEAM_CODES).length).toBe(51); });
  expected.forEach(function(team){ it('has entry for '+team, function(){ if(!TEAM_CODES[team]) throw new Error('Missing: '+team); }); });
  it('England=gb-eng', function(){ expect(TEAM_CODES['England']).toBe('gb-eng'); });
  it('Scotland=gb-sct', function(){ expect(TEAM_CODES['Scotland']).toBe('gb-sct'); });
  it('TBD=un', function(){ expect(TEAM_CODES['TBD']).toBe('un'); });
  it('Ivory Coast=ci', function(){ expect(TEAM_CODES['Ivory Coast']).toBe('ci'); });
});

// 2. teamFlagImg
describe('teamFlagImg() - 32x24 img tags', function() {
  it('img tag with correct src for Argentina', function(){ expect(teamFlagImg('Argentina')).toContain('32x24/ar.png'); });
  it('has dm-flag class', function(){ expect(teamFlagImg('France')).toContain('class="dm-flag"'); });
  it('England uses gb-eng', function(){ expect(teamFlagImg('England')).toContain('32x24/gb-eng.png'); });
  it('Scotland uses gb-sct', function(){ expect(teamFlagImg('Scotland')).toContain('32x24/gb-sct.png'); });
  it('empty for unknown team', function(){ expect(teamFlagImg('Atlantis')).toBe(''); });
  it('empty for empty string', function(){ expect(teamFlagImg('')).toBe(''); });
  it('uses 32x24 not 20x15', function(){ expect(teamFlagImg('Brazil')).toContain('32x24'); expect(teamFlagImg('Brazil')).notToContain('20x15'); });
  it('no display:inline-block style', function(){ expect(teamFlagImg('Brazil')).notToContain('display:inline-block'); });
});

// 3. countryToFlag
describe('countryToFlag() - 20x15 leaderboard flags', function() {
  it('img for Argentina', function(){ expect(countryToFlag('Argentina')).toContain('20x15/ar.png'); });
  it('accepts 2-letter ISO code', function(){ expect(countryToFlag('fr')).toContain('20x15/fr.png'); });
  it('empty for null', function(){ expect(countryToFlag(null)).toBe(''); });
  it('empty for empty string', function(){ expect(countryToFlag('')).toBe(''); });
  it('empty for unknown country', function(){ expect(countryToFlag('Neverland')).toBe(''); });
  it('no display:inline-block (removed in this commit)', function(){ expect(countryToFlag('France')).notToContain('display:inline-block'); });
  it('includes vertical-align:middle', function(){ expect(countryToFlag('Germany')).toContain('vertical-align:middle'); });
  it('Turkiye alias works', function(){ expect(countryToFlag('Turkiye')).toContain('20x15/tr.png'); });
  it('Bosnia & Herz. alias works', function(){ expect(countryToFlag('Bosnia & Herz.')).toContain('20x15/ba.png'); });
  it('uses 20x15 not 32x24', function(){ expect(countryToFlag('Brazil')).toContain('20x15'); expect(countryToFlag('Brazil')).notToContain('32x24'); });
});

// 4. fmtDate
describe('fmtDate() - date formatting', function() {
  it('formats 2026-06-11', function(){ var r=fmtDate('2026-06-11'); expect(r).toContain('Jun'); expect(r).toContain('11'); });
  it('empty for null', function(){ expect(fmtDate(null)).toBe(''); });
  it('empty for empty string', function(){ expect(fmtDate('')).toBe(''); });
  it('includes weekday abbreviation', function(){
    var r=fmtDate('2026-06-14');
    var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    if(!days.some(function(d){ return r.includes(d); })) throw new Error('No weekday in: '+r);
  });
});

// 5. isMatchLocked
describe('isMatchLocked() - kickoff lock (ET = UTC-4)', function() {
  it('false for invalid time', function(){ expect(isMatchLocked('2026-06-11','TBD')).toBeFalse(); });
  it('false for far-future match', function(){ expect(isMatchLocked('2099-01-01','3:00 PM')).toBeFalse(); });
  it('true for past match', function(){ expect(isMatchLocked('2020-01-01','3:00 PM')).toBeTrue(); });
  it('12:00 PM = noon (locked if past)', function(){ expect(isMatchLocked('2020-06-11','12:00 PM')).toBeTrue(); });
  it('12:00 AM = midnight (locked if past)', function(){ expect(isMatchLocked('2020-06-11','12:00 AM')).toBeTrue(); });
  it('9:00 PM future = not locked', function(){ expect(isMatchLocked('2099-06-11','9:00 PM')).toBeFalse(); });
});

// 6. renderTodayMatches
describe('renderTodayMatches() - dark card structure', function() {
  var todayStr=(function(){ var n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); })();

  it('no-matches message when no matches today', function(){
    resetState();
    matches=[{id:'m1',date:'2099-01-01',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    expect(document.getElementById('todayMatchesContainer').innerHTML).toContain('no-matches-today');
  });
  it('dark-schedule wrapper rendered', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    var h=document.getElementById('todayMatchesContainer').innerHTML;
    expect(h).toContain('dark-schedule'); expect(h).toContain('dark-date-hdr'); expect(h).toContain('dark-matches-card');
  });
  it('dark-match-row with dm-time, dm-team, dm-meta', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    var h=document.getElementById('todayMatchesContainer').innerHTML;
    expect(h).toContain('dark-match-row'); expect(h).toContain('dm-time'); expect(h).toContain('dm-team'); expect(h).toContain('dm-meta');
  });
  it('VS shown when no score', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    expect(document.getElementById('todayMatchesContainer').innerHTML).toContain('dm-vs');
  });
  it('dm-score shown when score exists', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    actualScores={m1:{s1:2,s2:1}};
    renderTodayMatches();
    var h=document.getElementById('todayMatchesContainer').innerHTML;
    expect(h).toContain('dm-score'); expect(h).toContain('2 - 1');
  });
  it('flag images included for both teams', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    var h=document.getElementById('todayMatchesContainer').innerHTML;
    expect(h).toContain('32x24/ar.png'); expect(h).toContain('32x24/fr.png');
  });
  it('date header has day name and month/day', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    var hdr=document.querySelector('.dark-date-hdr');
    if(!hdr) throw new Error('No .dark-date-hdr');
    if(!/\w+ \d+\/\d+/.test(hdr.textContent)) throw new Error('Bad header: '+hdr.textContent);
  });
  it('no old today-match-card class', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    expect(document.getElementById('todayMatchesContainer').innerHTML).notToContain('today-match-card');
  });
  it('GROUP A label shown', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    expect(document.getElementById('todayMatchesContainer').innerHTML).toContain('GROUP A');
  });
  it('matches sorted by ET time', function(){
    resetState();
    matches=[
      {id:'m2',date:todayStr,team1:'Brazil',team2:'Germany',group:'B',stage:'Group Stage',time:'6:00 PM',venue:'MetLife Stadium'},
      {id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}
    ];
    renderTodayMatches();
    var h=document.getElementById('todayMatchesContainer').innerHTML;
    if(h.indexOf('3:00 PM') > h.indexOf('6:00 PM')) throw new Error('3:00 PM should appear before 6:00 PM');
  });
  it('map link shown for venue with map', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    expect(document.getElementById('todayMatchesContainer').innerHTML).toContain('maps.google.com');
  });
});

// 7. renderPredictions
describe('renderPredictions() - dark design, sort by time, group label, locking', function() {
  it('PIN prompt when not verified', function(){
    resetState(); pinVerified=false; renderPredictions();
    expect(document.getElementById('predictContainer').innerHTML).toContain('PIN');
  });
  it('pred-dark-wrap and pred-dark-card rendered', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('pred-dark-wrap'); expect(h).toContain('pred-dark-card');
  });
  it('pred-dark-row with team and inputs', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('pred-dark-row'); expect(h).toContain('pred-dark-team'); expect(h).toContain('pred-dark-inputs');
  });
  it('flag images for both teams', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('32x24/ar.png'); expect(h).toContain('32x24/fr.png');
  });

  // Group label (new feature)
  it('shows group name in gold after time', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('Group A'); expect(h).toContain('color:#D4AF37');
  });
  it('no group label for knockout matches (group=-)', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2099-07-01',team1:'France',team2:'Croatia',group:'-',stage:'Quarterfinal',time:'3:00 PM',venue:'MetLife Stadium'}];
    document.getElementById('predStageFilter').value='Quarterfinal';
    renderPredictions();
    expect(document.getElementById('predictContainer').innerHTML).notToContain('Group -');
  });
  it('no group-header dividers (replaced by time sort)', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[
      {id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'},
      {id:'m2',date:'2026-06-11',team1:'Brazil',team2:'Germany',group:'B',stage:'Group Stage',time:'6:00 PM',venue:'MetLife Stadium'}
    ];
    renderPredictions();
    expect(document.getElementById('predictContainer').innerHTML).notToContain('pred-dark-grp-hdr');
  });

  // Sort by time
  it('sorted by EST time (3pm before 6pm)', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[
      {id:'m2',date:'2026-06-11',team1:'Brazil',team2:'Germany',group:'B',stage:'Group Stage',time:'6:00 PM',venue:'MetLife Stadium'},
      {id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}
    ];
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    if(h.indexOf('3:00 PM') > h.indexOf('6:00 PM')) throw new Error('3:00 PM should come before 6:00 PM');
  });
  it('earlier date comes before later date', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[
      {id:'m2',date:'2026-06-12',team1:'Brazil',team2:'Germany',group:'B',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'},
      {id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'9:00 PM',venue:'MetLife Stadium'}
    ];
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    if(h.indexOf('Argentina') > h.indexOf('Brazil')) throw new Error('Jun 11 should appear before Jun 12');
  });

  // Filters
  it('date filter works', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[
      {id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'},
      {id:'m2',date:'2026-06-12',team1:'Brazil',team2:'Germany',group:'B',stage:'Group Stage',time:'6:00 PM',venue:'MetLife Stadium'}
    ];
    predDateFilter='2026-06-11'; renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('Argentina'); expect(h).notToContain('Brazil');
  });
  it('show-unpredicted filter works', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[
      {id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'},
      {id:'m2',date:'2026-06-12',team1:'Brazil',team2:'Germany',group:'B',stage:'Group Stage',time:'6:00 PM',venue:'MetLife Stadium'}
    ];
    predictions={'Saju':{m1:{s1:2,s2:1}}};
    document.getElementById('showUnpredicted').checked=true; renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('Brazil'); expect(h).notToContain('Argentina');
  });

  // Locking
  it('actual score shown when available', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2020-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    actualScores={m1:{s1:3,s2:1}}; renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('pred-dark-actual'); expect(h).toContain('Actual: 3-1');
  });
  it('locked badge shown for past match', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2020-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('pred-dark-lock'); expect(h).toContain('Locked');
  });
  it('inputs disabled for past match', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2020-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredictions();
    var inputs=document.querySelectorAll('#predictContainer input[disabled]');
    if(inputs.length!==2) throw new Error('Expected 2 disabled inputs, got '+inputs.length);
  });
  it('inputs enabled for future match', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2099-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredictions();
    var inputs=document.querySelectorAll('#predictContainer input[disabled]');
    if(inputs.length!==0) throw new Error('Expected 0 disabled inputs, got '+inputs.length);
  });

  // Points badges
  it('+3 pts for exact score', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2020-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    actualScores={m1:{s1:2,s2:1}}; predictions={'Saju':{m1:{s1:2,s2:1}}};
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('score-exact'); expect(h).toContain('+3 pts');
  });
  it('+1 pt for correct result', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2020-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    actualScores={m1:{s1:2,s2:1}}; predictions={'Saju':{m1:{s1:3,s2:0}}};
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('score-result'); expect(h).toContain('+1 pt');
  });
  it('0 pts for wrong prediction', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2020-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    actualScores={m1:{s1:2,s2:1}}; predictions={'Saju':{m1:{s1:0,s2:2}}};
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('score-wrong'); expect(h).toContain('0 pts');
  });

  // Knockout
  it('knockout stage header shown', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2099-07-01',team1:'France',team2:'Croatia',group:'-',stage:'Quarterfinal',time:'3:00 PM',venue:'MetLife Stadium'}];
    document.getElementById('predStageFilter').value='Quarterfinal'; renderPredictions();
    expect(document.getElementById('predictContainer').innerHTML).toContain('Quarterfinal');
  });
  it('group filter hidden for knockout', function(){
    resetState(); pinVerified=true; currentUser='Saju'; matches=[];
    document.getElementById('predStageFilter').value='Quarterfinal'; renderPredictions();
    expect(document.getElementById('predGroupFilter').style.display).toBe('none');
  });
});

// 8. renderPredDateButtons
describe('renderPredDateButtons() - date filter buttons', function() {
  var todayStr=(function(){ var n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); })();

  it('date row stays visible for knockout stages (per-stage date buttons, not hidden)', function(){
    resetState(); document.getElementById('predStageFilter').value='Quarterfinal';
    renderPredDateButtons();
    expect(document.getElementById('predDateRow').style.display).toBe('flex');
  });
  it('date row shown for Group Stage', function(){
    resetState(); matches=[{id:'m1',date:'2026-06-11',stage:'Group Stage',team1:'A',team2:'B',group:'A',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredDateButtons();
    expect(document.getElementById('predDateRow').style.display).toBe('flex');
  });
  it('All button always present', function(){
    resetState(); matches=[{id:'m1',date:'2026-06-11',stage:'Group Stage',team1:'A',team2:'B',group:'A',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredDateButtons();
    expect(document.getElementById('predDateBtns').innerHTML).toContain('>All<');
  });
  it('today highlighted with zap marker', function(){
    resetState();
    matches=[
      {id:'m1',date:todayStr,stage:'Group Stage',team1:'A',team2:'B',group:'A',time:'3:00 PM',venue:'MetLife Stadium'},
      {id:'m2',date:'2026-06-01',stage:'Group Stage',team1:'C',team2:'D',group:'B',time:'6:00 PM',venue:'MetLife Stadium'}
    ];
    renderPredDateButtons();
    expect(document.getElementById('predDateBtns').innerHTML).toContain('zap ');
  });
  it('no zap marker for non-today dates', function(){
    resetState(); matches=[{id:'m1',date:'2026-06-01',stage:'Group Stage',team1:'A',team2:'B',group:'A',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredDateButtons();
    expect(document.getElementById('predDateBtns').innerHTML).notToContain('zap ');
  });
  it('selected date gets navy background', function(){
    resetState(); predDateFilter='2026-06-11';
    matches=[{id:'m1',date:'2026-06-11',stage:'Group Stage',team1:'A',team2:'B',group:'A',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredDateButtons();
    expect(document.getElementById('predDateBtns').innerHTML).toContain('background:var(--navy)');
  });
  it('setPredDate updates predDateFilter', function(){
    resetState(); matches=[]; setPredDate('2026-06-15');
    expect(predDateFilter).toBe('2026-06-15');
  });
  it('setPredDate resets with empty string', function(){
    resetState(); predDateFilter='2026-06-11'; matches=[]; setPredDate('');
    expect(predDateFilter).toBe('');
  });
});

// 9. predStageMatch() - dropdown stage split (Group Stage/R32/R16/QF/SF/Final)
describe('predStageMatch() - stage dropdown split', function(){
  var gs = {id:1, stage:'Group Stage'};
  var r32 = {id:2, stage:'Round of 32'};
  var r16 = {id:3, stage:'Round of 16'};
  var qf  = {id:4, stage:'Quarterfinal'};
  var sf  = {id:5, stage:'Semifinal'};
  var fin = {id:6, stage:'Final'};
  var bronze = {id:7, stage:'Bronze Medal'};

  it('"Group Stage" matches only Group Stage matches', function(){
    expect(predStageMatch(gs,'Group Stage')).toBeTrue();
    expect(predStageMatch(r32,'Group Stage')).toBeFalse();
  });
  it('"Round of 32" matches only Round of 32', function(){
    expect(predStageMatch(r32,'Round of 32')).toBeTrue();
    expect(predStageMatch(r16,'Round of 32')).toBeFalse();
  });
  it('"Round of 16" matches only Round of 16', function(){
    expect(predStageMatch(r16,'Round of 16')).toBeTrue();
    expect(predStageMatch(qf,'Round of 16')).toBeFalse();
    expect(predStageMatch(r32,'Round of 16')).toBeFalse();
  });
  it('"Quarterfinal" matches only Quarterfinal', function(){
    expect(predStageMatch(qf,'Quarterfinal')).toBeTrue();
    expect(predStageMatch(sf,'Quarterfinal')).toBeFalse();
  });
  it('"Semifinal" matches only Semifinal', function(){
    expect(predStageMatch(sf,'Semifinal')).toBeTrue();
    expect(predStageMatch(fin,'Semifinal')).toBeFalse();
  });
  it('"Final" matches both Final and Bronze Medal', function(){
    expect(predStageMatch(fin,'Final')).toBeTrue();
    expect(predStageMatch(bronze,'Final')).toBeTrue();
  });
  it('"Final" does not match Semifinal', function(){
    expect(predStageMatch(sf,'Final')).toBeFalse();
  });
});

// 10. renderPredictions() - per-stage filtering with the new dropdown
describe('renderPredictions() - per-stage filtering (Group Stage/R32/R16/QF/SF/Final)', function(){
  function koMatches(){
    return [
      {id:'g1', date:'2026-06-11', team1:'Argentina', team2:'France', group:'A', stage:'Group Stage', time:'3:00 PM', venue:'MetLife Stadium'},
      {id:'r32a', date:'2026-06-28', team1:'South Africa', team2:'Canada', group:'-', stage:'Round of 32', time:'3:00 PM', venue:'MetLife Stadium'},
      {id:'r16a', date:'2026-07-04', team1:'Brazil', team2:'Germany', group:'-', stage:'Round of 16', time:'1:00 PM', venue:'MetLife Stadium'},
      {id:'qfa', date:'2026-07-09', team1:'Spain', team2:'Portugal', group:'-', stage:'Quarterfinal', time:'4:00 PM', venue:'MetLife Stadium'},
      {id:'sfa', date:'2026-07-14', team1:'England', team2:'Netherlands', group:'-', stage:'Semifinal', time:'3:00 PM', venue:'MetLife Stadium'},
      {id:'fina', date:'2026-07-19', team1:'Croatia', team2:'Belgium', group:'-', stage:'Final', time:'3:00 PM', venue:'MetLife Stadium'},
      {id:'bronze1', date:'2026-07-18', team1:'Uruguay', team2:'Japan', group:'-', stage:'Bronze Medal', time:'5:00 PM', venue:'MetLife Stadium'}
    ];
  }

  it('"Round of 32" shows only Round of 32 matches', function(){
    resetState(); pinVerified=true; currentUser='Saju'; matches=koMatches();
    document.getElementById('predStageFilter').value='Round of 32';
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('South Africa'); expect(h).toContain('Canada');
    expect(h).notToContain('Brazil'); expect(h).notToContain('Spain'); expect(h).notToContain('Argentina');
  });
  it('"Round of 16" shows only Round of 16 matches', function(){
    resetState(); pinVerified=true; currentUser='Saju'; matches=koMatches();
    document.getElementById('predStageFilter').value='Round of 16';
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('Brazil'); expect(h).toContain('Germany');
    expect(h).notToContain('South Africa'); expect(h).notToContain('Spain');
  });
  it('"Quarterfinal" shows only Quarterfinal matches', function(){
    resetState(); pinVerified=true; currentUser='Saju'; matches=koMatches();
    document.getElementById('predStageFilter').value='Quarterfinal';
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('Spain'); expect(h).toContain('Portugal');
    expect(h).notToContain('Brazil'); expect(h).notToContain('England');
  });
  it('"Semifinal" shows only Semifinal matches', function(){
    resetState(); pinVerified=true; currentUser='Saju'; matches=koMatches();
    document.getElementById('predStageFilter').value='Semifinal';
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('England'); expect(h).toContain('Netherlands');
    expect(h).notToContain('Croatia'); expect(h).notToContain('Spain');
  });
  it('"Final" shows both the Final match and the Bronze Medal match', function(){
    resetState(); pinVerified=true; currentUser='Saju'; matches=koMatches();
    document.getElementById('predStageFilter').value='Final';
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('Croatia'); expect(h).toContain('Belgium');
    expect(h).toContain('Uruguay'); expect(h).toContain('Japan');
  });
  it('"Final" excludes Semifinal matches', function(){
    resetState(); pinVerified=true; currentUser='Saju'; matches=koMatches();
    document.getElementById('predStageFilter').value='Final';
    renderPredictions();
    expect(document.getElementById('predictContainer').innerHTML).notToContain('Netherlands');
  });
  it('"Group Stage" still only shows Group Stage matches (unaffected by KO split)', function(){
    resetState(); pinVerified=true; currentUser='Saju'; matches=koMatches();
    document.getElementById('predStageFilter').value='Group Stage';
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('Argentina'); expect(h).notToContain('South Africa');
  });

  ['Round of 32','Round of 16','Quarterfinal','Semifinal','Final'].forEach(function(stage){
    it('group filter is hidden when "'+stage+'" is selected', function(){
      resetState(); pinVerified=true; currentUser='Saju'; matches=koMatches();
      document.getElementById('predStageFilter').value=stage;
      renderPredictions();
      expect(document.getElementById('predGroupFilter').style.display).toBe('none');
    });
  });
  it('group filter is visible when "Group Stage" is selected', function(){
    resetState(); pinVerified=true; currentUser='Saju'; matches=koMatches();
    document.getElementById('predStageFilter').value='Group Stage';
    renderPredictions();
    expect(document.getElementById('predGroupFilter').style.display).toBe('');
  });
});

// 11. renderPredictions() - "waiting for Admin" gate, per stage
describe('renderPredictions() - waiting-for-Admin message names the selected stage', function(){
  it('"Round of 16" with all-TBD teams shows a Round of 16 specific waiting message', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'r16x', date:'2026-07-04', team1:'TBD', team2:'TBD', group:'-', stage:'Round of 16', time:'1:00 PM', venue:'MetLife Stadium'}];
    document.getElementById('predStageFilter').value='Round of 16';
    renderPredictions();
    expect(document.getElementById('predictContainer').innerHTML).toContain('Round of 16 predictions will be available');
  });
  it('"Quarterfinal" with all-TBD teams shows a Quarterfinal specific waiting message', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'qfx', date:'2026-07-09', team1:'TBD', team2:'TBD', group:'-', stage:'Quarterfinal', time:'4:00 PM', venue:'MetLife Stadium'}];
    document.getElementById('predStageFilter').value='Quarterfinal';
    renderPredictions();
    expect(document.getElementById('predictContainer').innerHTML).toContain('Quarterfinal predictions will be available');
  });
  it('"Final" with all-TBD teams (Final + Bronze Medal) shows a Final specific waiting message', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[
      {id:'finx', date:'2026-07-19', team1:'TBD', team2:'TBD', group:'-', stage:'Final', time:'3:00 PM', venue:'MetLife Stadium'},
      {id:'bronzex', date:'2026-07-18', team1:'TBD', team2:'TBD', group:'-', stage:'Bronze Medal', time:'5:00 PM', venue:'MetLife Stadium'}
    ];
    document.getElementById('predStageFilter').value='Final';
    renderPredictions();
    expect(document.getElementById('predictContainer').innerHTML).toContain('Final predictions will be available');
  });
  it('once Admin sets one real team via knockoutTeams, the waiting message is replaced by the match', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'r16y', date:'2026-07-04', team1:'TBD', team2:'TBD', group:'-', stage:'Round of 16', time:'1:00 PM', venue:'MetLife Stadium'}];
    knockoutTeams={r16y:{team1:'Brazil', team2:'TBD'}};
    document.getElementById('predStageFilter').value='Round of 16';
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('Brazil');
    expect(h).notToContain('predictions will be available');
  });
});

// 12. renderPredDateButtons() - per-stage date buttons with new dropdown
describe('renderPredDateButtons() - per-stage dates with new dropdown split', function(){
  function koMatches(){
    return [
      {id:'r16a', date:'2026-07-04', team1:'Brazil', team2:'Germany', group:'-', stage:'Round of 16', time:'1:00 PM', venue:'MetLife Stadium'},
      {id:'r16b', date:'2026-07-05', team1:'Spain', team2:'Portugal', group:'-', stage:'Round of 16', time:'4:00 PM', venue:'MetLife Stadium'},
      {id:'qfa', date:'2026-07-09', team1:'England', team2:'Netherlands', group:'-', stage:'Quarterfinal', time:'4:00 PM', venue:'MetLife Stadium'}
    ];
  }
  it('"Round of 16" date buttons only include Round of 16 dates, not Quarterfinal dates', function(){
    resetState(); matches=koMatches();
    document.getElementById('predStageFilter').value='Round of 16';
    renderPredDateButtons();
    var h=document.getElementById('predDateBtns').innerHTML;
    expect(h).toContain('Jul 4'); expect(h).toContain('Jul 5'); expect(h).notToContain('Jul 9');
  });
  it('"Quarterfinal" date buttons only include Quarterfinal dates', function(){
    resetState(); matches=koMatches();
    document.getElementById('predStageFilter').value='Quarterfinal';
    renderPredDateButtons();
    var h=document.getElementById('predDateBtns').innerHTML;
    expect(h).toContain('Jul 9'); expect(h).notToContain('Jul 4');
  });
});

// =============================================================
// CONSTANTS & STUBS FOR NEW FEATURES
// =============================================================

// Auto-logout constants (copied from FIFA2026_Prediction.html)
var INACTIVITY_LIMIT = 2 * 60 * 1000; // 2 minutes
var INACTIVITY_WARN  = 30 * 1000;      // 30 seconds

// Minimal toast tracker to support stopInactivityTimer tests
var _inactivityTimer  = null;
var _inactivityWarn   = null;
var _inactivityToastEl = null;

function _clearInactivityToast() {
  if (_inactivityToastEl) { _inactivityToastEl.remove(); _inactivityToastEl = null; }
}
function stopInactivityTimer() {
  clearTimeout(_inactivityTimer);
  clearTimeout(_inactivityWarn);
  _clearInactivityToast();
}
function startInactivityTimer() { stopInactivityTimer(); }

// R32 match data (ground truth from FIFA2026_Prediction.html lines 549-564)
var R32_MATCHES = [
  {id:73, stage:'Round of 32', date:'2026-06-28', time:'3:00 PM', team1:'South Africa',   team2:'Canada',              venue:'SoFi Stadium, Inglewood'},
  {id:74, stage:'Round of 32', date:'2026-06-29', time:'1:00 PM', team1:'Brazil',          team2:'Japan',               venue:'NRG Stadium, Houston'},
  {id:75, stage:'Round of 32', date:'2026-06-29', time:'4:30 PM', team1:'Germany',         team2:'Paraguay',            venue:'Gillette Stadium, Foxborough'},
  {id:76, stage:'Round of 32', date:'2026-06-29', time:'9:00 PM', team1:'Netherlands',     team2:'Morocco',             venue:'Estadio BBVA, Monterrey'},
  {id:77, stage:'Round of 32', date:'2026-06-30', time:'1:00 PM', team1:'Ivory Coast',     team2:'Norway',              venue:'AT&T Stadium, Arlington'},
  {id:78, stage:'Round of 32', date:'2026-06-30', time:'5:00 PM', team1:'France',          team2:'Sweden',              venue:'MetLife Stadium, East Rutherford'},
  {id:79, stage:'Round of 32', date:'2026-06-30', time:'9:00 PM', team1:'Mexico',          team2:'Scotland',            venue:'Estadio Azteca, Mexico City'},
  {id:80, stage:'Round of 32', date:'2026-07-01', time:'12:00 PM',team1:'TBD (W-L)',       team2:'Senegal',             venue:'Mercedes-Benz Stadium, Atlanta'},
  {id:81, stage:'Round of 32', date:'2026-07-01', time:'4:00 PM', team1:'Belgium',         team2:'South Korea',         venue:'Lumen Field, Seattle'},
  {id:82, stage:'Round of 32', date:'2026-07-01', time:'8:00 PM', team1:'USA',             team2:'Bosnia & Herzegovina',venue:"Levi's Stadium, Santa Clara"},
  {id:83, stage:'Round of 32', date:'2026-07-02', time:'3:00 PM', team1:'Spain',           team2:'TBD (2nd-J)',         venue:'SoFi Stadium, Inglewood'},
  {id:84, stage:'Round of 32', date:'2026-07-02', time:'7:00 PM', team1:'TBD (2nd-K)',     team2:'TBD (2nd-L)',         venue:'BMO Field, Toronto'},
  {id:85, stage:'Round of 32', date:'2026-07-02', time:'11:00 PM',team1:'Switzerland',     team2:'Ecuador',             venue:'BC Place, Vancouver'},
  {id:86, stage:'Round of 32', date:'2026-07-03', time:'2:00 PM', team1:'Australia',       team2:'Egypt',               venue:'AT&T Stadium, Arlington'},
  {id:87, stage:'Round of 32', date:'2026-07-03', time:'6:00 PM', team1:'Argentina',       team2:'Cape Verde',          venue:'Hard Rock Stadium, Miami Gardens'},
  {id:88, stage:'Round of 32', date:'2026-07-03', time:'9:30 PM', team1:'TBD (W-K)',       team2:'Croatia',             venue:'Arrowhead Stadium, Kansas City'}
];

// =============================================================
// NEW TEST SUITES
// =============================================================

// 9. Flag fixes: USA & Bosnia & Herzegovina aliases
describe('Flag fixes - USA & Bosnia & Herzegovina display names', function() {
  it('TEAM_CODES["USA"] = "us"', function() {
    expect(TEAM_CODES['USA']).toBe('us');
  });
  it('TEAM_CODES["Bosnia & Herzegovina"] = "ba"', function() {
    expect(TEAM_CODES['Bosnia & Herzegovina']).toBe('ba');
  });
  it('teamFlagImg("USA") returns img with us.png', function() {
    expect(teamFlagImg('USA')).toContain('32x24/us.png');
  });
  it('teamFlagImg("Bosnia & Herzegovina") returns img with ba.png', function() {
    expect(teamFlagImg('Bosnia & Herzegovina')).toContain('32x24/ba.png');
  });
  it('teamFlagImg("USA") is not empty string', function() {
    var r = teamFlagImg('USA');
    if (r === '') throw new Error('Got empty string - flag lookup failed for USA');
  });
  it('teamFlagImg("Bosnia & Herzegovina") is not empty string', function() {
    var r = teamFlagImg('Bosnia & Herzegovina');
    if (r === '') throw new Error('Got empty string - flag lookup failed for Bosnia & Herzegovina');
  });
  it('USA and "United States" both resolve to "us"', function() {
    expect(TEAM_CODES['USA']).toBe(TEAM_CODES['United States']);
  });
  it('"Bosnia & Herzegovina" and "Bosnia & Herz." both resolve to "ba"', function() {
    expect(TEAM_CODES['Bosnia & Herzegovina']).toBe(TEAM_CODES['Bosnia & Herz.']);
  });
});

// 10. Auto-logout timer constants
describe('Auto-logout - timer constants', function() {
  it('INACTIVITY_LIMIT is 120000 ms (2 minutes)', function() {
    expect(INACTIVITY_LIMIT).toBe(120000);
  });
  it('INACTIVITY_WARN is 30000 ms (30 seconds)', function() {
    expect(INACTIVITY_WARN).toBe(30000);
  });
  it('Warning fires 90s before logout (LIMIT minus WARN = 90000 ms)', function() {
    expect(INACTIVITY_LIMIT - INACTIVITY_WARN).toBe(90000);
  });
  it('INACTIVITY_WARN is less than INACTIVITY_LIMIT', function() {
    if (INACTIVITY_WARN >= INACTIVITY_LIMIT) throw new Error('Warn must be less than limit');
  });
  it('stopInactivityTimer is a function', function() {
    if (typeof stopInactivityTimer !== 'function') throw new Error('Expected function');
  });
  it('startInactivityTimer is a function', function() {
    if (typeof startInactivityTimer !== 'function') throw new Error('Expected function');
  });
  it('stopInactivityTimer clears any injected toast from DOM', function() {
    var fake = document.createElement('div');
    fake.id = 'inactivity-toast-test';
    _inactivityToastEl = fake;
    document.body.appendChild(fake);
    stopInactivityTimer();
    var remaining = document.getElementById('inactivity-toast-test');
    if (remaining) throw new Error('Toast element still in DOM after stopInactivityTimer()');
  });
  it('stopInactivityTimer does not throw when called with no timers running', function() {
    var threw = false;
    try { stopInactivityTimer(); } catch(e) { threw = true; }
    if (threw) throw new Error('stopInactivityTimer threw an error');
  });
});

// 11. R32 venue names
describe('R32 venues (all 16 matches)', function() {
  var expected = {
    73:'SoFi Stadium, Inglewood',
    74:'NRG Stadium, Houston',
    75:'Gillette Stadium, Foxborough',
    76:'Estadio BBVA, Monterrey',
    77:'AT&T Stadium, Arlington',
    78:'MetLife Stadium, East Rutherford',
    79:'Estadio Azteca, Mexico City',
    80:'Mercedes-Benz Stadium, Atlanta',
    81:'Lumen Field, Seattle',
    82:"Levi's Stadium, Santa Clara",
    83:'SoFi Stadium, Inglewood',
    84:'BMO Field, Toronto',
    85:'BC Place, Vancouver',
    86:'AT&T Stadium, Arlington',
    87:'Hard Rock Stadium, Miami Gardens',
    88:'Arrowhead Stadium, Kansas City'
  };
  Object.keys(expected).forEach(function(id) {
    it('Match #'+id+' venue: "'+expected[id]+'"', function() {
      var m = R32_MATCHES.filter(function(x){ return x.id === parseInt(id); })[0];
      if (!m) throw new Error('Match #'+id+' not found in R32_MATCHES');
      if (m.venue !== expected[id]) throw new Error('Expected "'+expected[id]+'", got "'+m.venue+'"');
    });
  });
  it('all 16 R32 matches present', function() {
    expect(R32_MATCHES.length).toBe(16);
  });
  it('no match has an empty venue', function() {
    var bad = R32_MATCHES.filter(function(m){ return !m.venue || m.venue.trim() === ''; });
    if (bad.length) throw new Error('Match(es) with empty venue: '+bad.map(function(m){return m.id;}).join(', '));
  });
});

// 12. R32 confirmed team matchups
describe('R32 confirmed team matchups', function() {
  var confirmed = {
    73:['South Africa','Canada'],
    74:['Brazil','Japan'],
    75:['Germany','Paraguay'],
    76:['Netherlands','Morocco'],
    77:['Ivory Coast','Norway'],
    78:['France','Sweden'],
    79:['Mexico','Scotland'],
    81:['Belgium','South Korea'],
    82:['USA','Bosnia & Herzegovina'],
    85:['Switzerland','Ecuador'],
    86:['Australia','Egypt'],
    87:['Argentina','Cape Verde']
  };
  Object.keys(confirmed).forEach(function(id) {
    var teams = confirmed[id];
    it('Match #'+id+': '+teams[0]+' vs '+teams[1], function() {
      var m = R32_MATCHES.filter(function(x){ return x.id === parseInt(id); })[0];
      if (!m) throw new Error('Match #'+id+' not found');
      if (m.team1 !== teams[0]) throw new Error('team1: expected "'+teams[0]+'", got "'+m.team1+'"');
      if (m.team2 !== teams[1]) throw new Error('team2: expected "'+teams[1]+'", got "'+m.team2+'"');
    });
  });
  it('Match #80: Senegal is confirmed team2', function() {
    var m = R32_MATCHES.filter(function(x){ return x.id === 80; })[0];
    expect(m.team2).toBe('Senegal');
  });
  it('Match #88: Croatia is confirmed team2', function() {
    var m = R32_MATCHES.filter(function(x){ return x.id === 88; })[0];
    expect(m.team2).toBe('Croatia');
  });
  it('Match #83: Spain is confirmed team1', function() {
    var m = R32_MATCHES.filter(function(x){ return x.id === 83; })[0];
    expect(m.team1).toBe('Spain');
  });
  it('5 TBD slots remaining (matches 80 team1, 83 team2, 84 both, 88 team1)', function() {
    var tbdCount = R32_MATCHES.reduce(function(n, m) {
      return n + (m.team1.startsWith('TBD') ? 1 : 0) + (m.team2.startsWith('TBD') ? 1 : 0);
    }, 0);
    expect(tbdCount).toBe(5);
  });
  it('USA flag is resolvable via teamFlagImg', function() {
    var m = R32_MATCHES.filter(function(x){ return x.id === 82; })[0];
    var img = teamFlagImg(m.team1);
    if (img === '') throw new Error('Flag lookup failed for team1="'+m.team1+'" in match #82');
  });
  it('Bosnia & Herzegovina flag is resolvable via teamFlagImg', function() {
    var m = R32_MATCHES.filter(function(x){ return x.id === 82; })[0];
    var img = teamFlagImg(m.team2);
    if (img === '') throw new Error('Flag lookup failed for team2="'+m.team2+'" in match #82');
  });
});

// 13. R32 dates and times
describe('R32 dates and kickoff times', function() {
  it('first R32 match (#73) kicks off 2026-06-28', function() {
    expect(R32_MATCHES[0].date).toBe('2026-06-28');
  });
  it('last R32 match (#88) kicks off 2026-07-03', function() {
    expect(R32_MATCHES[R32_MATCHES.length-1].date).toBe('2026-07-03');
  });
  it('all R32 matches have valid date strings (YYYY-MM-DD)', function() {
    var bad = R32_MATCHES.filter(function(m){ return !/^\d{4}-\d{2}-\d{2}$/.test(m.date); });
    if (bad.length) throw new Error('Bad date in: '+bad.map(function(m){return m.id;}).join(', '));
  });
  it('all R32 matches have valid AM/PM time strings', function() {
    var bad = R32_MATCHES.filter(function(m){ return !/\d+:\d{2}\s*(AM|PM)/i.test(m.time); });
    if (bad.length) throw new Error('Bad time in: '+bad.map(function(m){return m.id;}).join(', '));
  });
  it('all R32 match IDs are in range 73-88', function() {
    var bad = R32_MATCHES.filter(function(m){ return m.id < 73 || m.id > 88; });
    if (bad.length) throw new Error('Out-of-range IDs: '+bad.map(function(m){return m.id;}).join(', '));
  });
  it('no duplicate match IDs', function() {
    var ids = R32_MATCHES.map(function(m){ return m.id; });
    var unique = Array.from(new Set(ids));
    if (unique.length !== ids.length) throw new Error('Duplicate match IDs found');
  });
  it('Match #75 starts at 4:30 PM (not 4:00 PM)', function() {
    var m = R32_MATCHES.filter(function(x){ return x.id === 75; })[0];
    expect(m.time).toBe('4:30 PM');
  });
});

// =============================================================
// RENDER RESULTS
// =============================================================
var totalPass=0, totalFail=0;
var resultsEl=document.getElementById('results');

suites.forEach(function(suite) {
  var sp=suite.tests.filter(function(t){ return t.pass; }).length;
  var sf=suite.tests.filter(function(t){ return !t.pass; }).length;
  totalPass+=sp; totalFail+=sf;

  var suiteEl=document.createElement('div');
  suiteEl.className='suite';

  var hdr=document.createElement('div');
  hdr.className='suite-title';
  hdr.innerHTML=suite.name+'<span style="float:right;font-weight:400;font-size:.85rem">'+sp+'/'+suite.tests.length+' passed</span>';
  suiteEl.appendChild(hdr);

  suite.tests.forEach(function(t) {
    var div=document.createElement('div');
    div.className='test '+(t.pass?'pass':'fail');
    var badge=document.createElement('span');
    badge.className='badge '+(t.pass?'pass':'fail');
    badge.textContent=t.pass?'PASS':'FAIL';
    var nameDiv=document.createElement('div');
    nameDiv.className='test-name';
    nameDiv.textContent=t.name;
    if(t.err) {
      var errDiv=document.createElement('div');
      errDiv.className='test-err';
      errDiv.textContent=t.err;
      nameDiv.appendChild(errDiv);
    }
    div.appendChild(badge);
    div.appendChild(nameDiv);
    suiteEl.appendChild(div);
  });
  resultsEl.appendChild(suiteEl);
});

var summaryEl=document.getElementById('summary');
summaryEl.className='summary '+(totalFail===0?'all-pass':'has-fail');
summaryEl.textContent=totalFail===0
  ? 'All '+totalPass+' tests passed'
  : totalFail+' test'+(totalFail>1?'s':'')+' failed, '+totalPass+' passed ('+(totalPass+totalFail)+' total)';

document.title=(totalFail===0?'PASS':'FAIL')+' '+totalPass+'/'+(totalPass+totalFail)+' - FIFA 2026 Tests';
