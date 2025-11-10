import React from 'react'

function GenericComponent<T>(props: { value: T }) {
  return <div>{String(props.value)}</div>
}

export const Example = () => <GenericComponent value="test" />
