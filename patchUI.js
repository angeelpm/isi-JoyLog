const fs = require('fs');
const content = fs.readFileSync('frontend/src/components/LibraryEntryModal.tsx', 'utf8');

const anchor = `                {/* Legacy review */}
                {game.review && reviewLogs.length === 0 && (
                  <div style={{
                    padding: '1rem 1.1rem',
                    background: 'var(--bg-surface-2)',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-violet)', fontSize: '0.82rem' }}>{user?.username || 'You'}</span>
                      {game.rating > 0 && <div style={{ display: 'flex', gap: '2px' }}>{renderStaticStars(game.rating)}</div>}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>{game.review}</p>
                  </div>
                )}
              </div>`;

const insertion = `
              {/* Community Reviews Section */}
              {communityReviews.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    marginBottom: '1rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Community Reviews</h3>
                    <span style={{
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '100px',
                      padding: '0.1rem 0.55rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      {communityReviews.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    {communityReviews.map((log: any, idx: number) => (
                      <div key={'comm-'+idx} style={{
                        padding: '1rem 1.1rem',
                        background: 'var(--bg-surface-2)',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent-violet)' }}>{log.username}</span>
                            <span style={{ color: 'var(--text-muted)' }}>·</span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'Unknown date'}
                            </span>
                            {log.hoursPlayed > 0 && (
                              <>
                                <span style={{ color: 'var(--text-muted)' }}>·</span>
                                <span style={{ color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                                  {log.hoursPlayed}h
                                </span>
                              </>
                            )}
                          </div>
                          {log.rating > 0 && <div style={{ display: 'flex', gap: '2px' }}>{renderStaticStars(log.rating)}</div>}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>{log.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}`;

const updated2 = content.replace(anchor, anchor + insertion);
fs.writeFileSync('frontend/src/components/LibraryEntryModal.tsx', updated2);
